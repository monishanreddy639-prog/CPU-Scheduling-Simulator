# CPU Scheduling Simulator

A simple Operating Systems mini-project built with HTML, CSS and JavaScript.

## Algorithms
- FCFS (First Come First Serve)
- SJF (Shortest Job First, non-preemptive)
- Round Robin (preemptive, user-defined time quantum)

## Features
- Add / remove / clear processes
- Completion, Turnaround and Waiting time table
- Average Waiting and Turnaround time
- Gantt chart with start/end times and CPU idle blocks

## Formulas
- Turnaround Time = Completion Time - Arrival Time
- Waiting Time = Turnaround Time - Burst Time

## How to Run
1. Open the folder in VS Code.
2. In the terminal run: `python -m http.server 5500`
3. Open http://localhost:5500 in your browser.

(You can also just double-click index.html.)