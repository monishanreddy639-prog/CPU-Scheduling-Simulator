// ---------- Data ----------
let processes = [];      // list of {pid, arrival, burst}
let selectedAlgo = "FCFS";

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showMessage(text, type) {
  const box = $("message");
  box.textContent = text;
  box.className = "message " + type;
}

function hideMessage() {
  $("message").className = "message hidden";
}

// ---------- Algorithm selection ----------
document.querySelectorAll("input[name='algo']").forEach((radio) => {
  radio.addEventListener("change", () => {
    selectedAlgo = radio.value;
    document.querySelectorAll(".algo-card").forEach((card) => card.classList.remove("selected"));
    radio.parentElement.classList.add("selected");
    $("quantumBox").classList.toggle("hidden", selectedAlgo !== "RR");
  });
});

// ---------- Process input ----------
$("processForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const pid = $("pid").value.trim();
  const arrivalText = $("arrival").value.trim();
  const burstText = $("burst").value.trim();

  if (pid === "" || arrivalText === "" || burstText === "") {
    showMessage("Please fill in Process ID, Arrival Time and Burst Time.", "error");
    return;
  }

  const arrival = Number(arrivalText);
  const burst = Number(burstText);

  if (!Number.isInteger(arrival) || arrival < 0) {
    showMessage("Arrival Time must be a whole number (0 or more).", "error");
    return;
  }
  if (!Number.isInteger(burst) || burst <= 0) {
    showMessage("Burst Time must be a whole number greater than 0.", "error");
    return;
  }
  if (processes.some((p) => p.pid.toLowerCase() === pid.toLowerCase())) {
    showMessage("Process ID '" + pid + "' already exists. Use a different ID.", "error");
    return;
  }

  processes.push({ pid, arrival, burst });
  hideMessage();
  $("processForm").reset();
  $("pid").focus();
  renderProcessTable();
});

function renderProcessTable() {
  const body = $("processBody");
  body.innerHTML = "";

  if (processes.length === 0) {
    body.innerHTML = "<tr><td colspan='4'>No processes added yet.</td></tr>";
    return;
  }

  processes.forEach((p, index) => {
    body.innerHTML +=
      "<tr>" +
      "<td>" + escapeHtml(p.pid) + "</td>" +
      "<td>" + p.arrival + "</td>" +
      "<td>" + p.burst + "</td>" +
      "<td><button class='btn btn-remove' data-index='" + index + "'>Remove</button></td>" +
      "</tr>";
  });
}

// Remove one process
$("processBody").addEventListener("click", (e) => {
  if (e.target.matches("button[data-index]")) {
    processes.splice(Number(e.target.dataset.index), 1);
    renderProcessTable();
    $("results").classList.add("hidden");
  }
});

// Clear all
$("clearBtn").addEventListener("click", () => {
  processes = [];
  renderProcessTable();
  hideMessage();
  $("results").classList.add("hidden");
});

// ---------- Scheduling algorithms ----------
// Each function returns a Gantt list: [{pid, start, end}, ...]
// A block with pid "Idle" means the CPU was waiting for a process to arrive.

function fcfs(list) {
  const sorted = [...list].sort((a, b) => a.arrival - b.arrival); // stable sort
  const gantt = [];
  let time = 0;

  sorted.forEach((p) => {
    if (time < p.arrival) {
      gantt.push({ pid: "Idle", start: time, end: p.arrival });
      time = p.arrival;
    }
    gantt.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
  });

  return gantt;
}

function sjf(list) {
  const gantt = [];
  const done = new Set();
  let time = 0;

  while (done.size < list.length) {
    // processes that have arrived and are not finished
    const ready = list.filter((p) => !done.has(p.pid) && p.arrival <= time);

    if (ready.length === 0) {
      // CPU idle until the next process arrives
      const nextArrival = Math.min(
        ...list.filter((p) => !done.has(p.pid)).map((p) => p.arrival)
      );
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    // pick shortest burst (tie -> earlier arrival)
    let chosen = ready[0];
    ready.forEach((p) => {
      if (
        p.burst < chosen.burst ||
        (p.burst === chosen.burst && p.arrival < chosen.arrival)
      ) {
        chosen = p;
      }
    });

    gantt.push({ pid: chosen.pid, start: time, end: time + chosen.burst });
    time += chosen.burst;
    done.add(chosen.pid);
  }

  return gantt;
}

function roundRobin(list, quantum) {
  const sorted = [...list].sort((a, b) => a.arrival - b.arrival); // stable sort
  const remaining = {};
  sorted.forEach((p) => (remaining[p.pid] = p.burst));

  const gantt = [];
  const queue = [];
  let time = 0;
  let next = 0;        // index of next process that has not entered the queue
  let finished = 0;

  // move all processes that have arrived by 'time' into the queue
  function addArrivals() {
    while (next < sorted.length && sorted[next].arrival <= time) {
      queue.push(sorted[next]);
      next++;
    }
  }

  while (finished < sorted.length) {
    addArrivals();

    if (queue.length === 0) {
      // CPU idle until next process arrives
      const nextArrival = sorted[next].arrival;
      gantt.push({ pid: "Idle", start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    const p = queue.shift();
    const runTime = Math.min(quantum, remaining[p.pid]);

    gantt.push({ pid: p.pid, start: time, end: time + runTime });
    time += runTime;
    remaining[p.pid] -= runTime;

    addArrivals();   // new arrivals go before the preempted process

    if (remaining[p.pid] > 0) {
      queue.push(p);
    } else {
      finished++;
    }
  }

  return gantt;
}

// ---------- Simulate ----------
$("simulateBtn").addEventListener("click", () => {
  if (processes.length === 0) {
    showMessage("Please add at least one process before simulating.", "info");
    $("results").classList.add("hidden");
    return;
  }

  let gantt;
  if (selectedAlgo === "FCFS") {
    gantt = fcfs(processes);
  } else if (selectedAlgo === "SJF") {
    gantt = sjf(processes);
  } else {
    const quantum = Number($("quantum").value);
    if ($("quantum").value.trim() === "" || !Number.isInteger(quantum) || quantum <= 0) {
      showMessage("Time Quantum must be a whole number greater than 0.", "error");
      $("results").classList.add("hidden");
      return;
    }
    gantt = roundRobin(processes, quantum);
  }

  hideMessage();
  showResults(gantt);
});

function showResults(gantt) {
  // completion time = end of the last block of each process
  const completion = {};
  gantt.forEach((block) => {
    if (block.pid !== "Idle") completion[block.pid] = block.end;
  });

  const body = $("resultBody");
  body.innerHTML = "";
  let totalWT = 0;
  let totalTAT = 0;

  processes.forEach((p) => {
    const ct = completion[p.pid];
    const tat = ct - p.arrival;
    const wt = tat - p.burst;
    totalTAT += tat;
    totalWT += wt;

    body.innerHTML +=
      "<tr>" +
      "<td>" + escapeHtml(p.pid) + "</td>" +
      "<td>" + p.arrival + "</td>" +
      "<td>" + p.burst + "</td>" +
      "<td>" + ct + "</td>" +
      "<td>" + tat + "</td>" +
      "<td>" + wt + "</td>" +
      "</tr>";
  });

  $("avgWT").textContent = (totalWT / processes.length).toFixed(2);
  $("avgTAT").textContent = (totalTAT / processes.length).toFixed(2);

  drawGantt(gantt);
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({ behavior: "smooth" });
}

function drawGantt(gantt) {
  const chart = $("gantt");
  chart.innerHTML = "";

  gantt.forEach((b, i) => {
    const duration = b.end - b.start;
    const isIdle = b.pid === "Idle";

    const block = document.createElement("div");
    block.className = "block";
    block.style.width = duration * 40 + "px";

    let html = "<div class='bar" + (isIdle ? " idle" : "") + "'>" + escapeHtml(b.pid) + "</div>";
    html += "<span class='t-start'>" + b.start + "</span>";
    if (i === gantt.length - 1) {
      html += "<span class='t-end'>" + b.end + "</span>";
    }
    block.innerHTML = html;
    chart.appendChild(block);
  });
}

// Show empty table message when page loads
renderProcessTable();