/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-for-of-loops/no-for-of-loops */

'use strict';

// 这些本应该在setupTests.js中设置，这里为了简便
global.__EXPERIMENTAL__ = true
global.__PROFILE__ = true
global.__DEV__ = true
global.spyOnDevAndProd = jest.spyOn;

// 扩展matcher
// expect(xx).Function() 这里的 Function 被称为 matcher
expect.extend({
  ...require('../react-18.1.0/scripts/jest/matchers/reactTestMatchers'),
  ...require('../react-18.1.0/scripts/jest/matchers/toThrow'),
  ...require('../react-18.1.0/scripts/jest/matchers/toWarnDev'),
});



let Scheduler;
// let runWithPriority;
let ImmediatePriority;
let UserBlockingPriority;
let NormalPriority;
let LowPriority;
let IdlePriority;
let scheduleCallback;
let cancelCallback;
// let wrapCallback;
// let getCurrentPriorityLevel;
// let shouldYield;



function priorityLevelToString(priorityLevel) {
  switch (priorityLevel) {
    case ImmediatePriority:
      return 'Immediate';
    case UserBlockingPriority:
      return 'User-blocking';
    case NormalPriority:
      return 'Normal';
    case LowPriority:
      return 'Low';
    case IdlePriority:
      return 'Idle';
    default:
      return null;
  }
}

function eventToString(event) {
  const map  = {
    1: 'TaskStartEvent',
    2: 'TaskCompleteEvent',
    3: 'TaskErrorEvent',
    4: 'TaskCancelEvent',
    5: 'TaskRunEvent',
    6: 'TaskYieldEvent',
    7: 'SchedulerSuspendEvent',
    8: 'SchedulerResumeEvent',
  };
  return map[event];
}


describe('Scheduler', () => {
  const {enableProfiling} = require('../react-18.1.0/packages/scheduler/src/SchedulerFeatureFlags');
  if (!enableProfiling) {
    // The tests in this suite only apply when profiling is on
    it('profiling APIs are not available', () => {
      Scheduler = require('scheduler');
      expect(Scheduler.unstable_Profiling).toBe(null);
    });
    return;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.mock('scheduler', () => require('../react-18.1.0/packages/scheduler/unstable_mock'));
    Scheduler = require('scheduler');

    // runWithPriority = Scheduler.unstable_runWithPriority;
    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    cancelCallback = Scheduler.unstable_cancelCallback;
    // wrapCallback = Scheduler.unstable_wrapCallback;
    // getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel;
    // shouldYield = Scheduler.unstable_shouldYield;
  });

  const TaskStartEvent = 1;
  const TaskCompleteEvent = 2;
  const TaskErrorEvent = 3;
  const TaskCancelEvent = 4;
  const TaskRunEvent = 5;
  const TaskYieldEvent = 6;
  const SchedulerSuspendEvent = 7;
  const SchedulerResumeEvent = 8;

  function stopProfilingAndPrintFlamegraph() {
    const eventBuffer = Scheduler.unstable_Profiling.stopLoggingProfilingEvents();
    if (eventBuffer === null) {
      return '(empty profile)';
    }

    const eventLog = new Int32Array(eventBuffer);

    const tasks = new Map();
    const mainThreadRuns = [];

    let isSuspended = true;
    let i = 0;
    processLog: while (i < eventLog.length) {
      const instruction = eventLog[i];
      const event = eventToString(instruction)
      const time = eventLog[i + 1];
      switch (instruction) {
        case 0: {
          break processLog;
        }
        case TaskStartEvent: {
          const taskId = eventLog[i + 2];
          const priorityLevel = eventLog[i + 3];
          const task = {
            id: taskId,
            priorityLevel,
            label: null,
            start: time,
            end: -1,
            exitStatus: null,
            runs: [],
          };
          tasks.set(taskId, task);
          i += 4;
          console.log(event, time, taskId, priorityLevelToString(priorityLevel));
          break;
        }
        case TaskCompleteEvent: {
          if (isSuspended) {
            throw Error('Task cannot Complete outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'completed';
          i += 3;
          console.log(event, time, taskId);
          break;
        }
        case TaskErrorEvent: {
          if (isSuspended) {
            throw Error('Task cannot Error outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'errored';
          i += 3;
          console.log(event, time, taskId);
          break;
        }
        case TaskCancelEvent: {
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.end = time;
          task.exitStatus = 'canceled';
          i += 3;
          console.log(event, time, taskId);
          break;
        }
        case TaskRunEvent:
        case TaskYieldEvent: {
          if (isSuspended) {
            throw Error('Task cannot Run or Yield outside the work loop.');
          }
          const taskId = eventLog[i + 2];
          const task = tasks.get(taskId);
          if (task === undefined) {
            throw Error('Task does not exist.');
          }
          task.runs.push(time);
          i += 4;
          console.log(event, time, taskId);
          break;
        }
        case SchedulerSuspendEvent: {
          if (isSuspended) {
            throw Error('Scheduler cannot Suspend outside the work loop.');
          }
          isSuspended = true;
          mainThreadRuns.push(time);
          i += 3;
          break;
        }
        case SchedulerResumeEvent: {
          if (!isSuspended) {
            throw Error('Scheduler cannot Resume inside the work loop.');
          }
          isSuspended = false;
          mainThreadRuns.push(time);
          i += 3;
          break;
        }
        default: {
          throw Error('Unknown instruction type: ' + instruction);
        }
      }
    }

    console.log('**************')
    // Now we can render the tasks as a flamegraph.
    const labelColumnWidth = 30;
    // Scheduler event times are in microseconds
    const microsecondsPerChar = 50000;

    let result = '';

    const mainThreadLabelColumn = '!!! Main thread              ';
    let mainThreadTimelineColumn = '';
    let isMainThreadBusy = true;
    for (const time of mainThreadRuns) {
      const index = time / microsecondsPerChar;
      mainThreadTimelineColumn += (isMainThreadBusy ? '█' : '░').repeat(
        index - mainThreadTimelineColumn.length,
      );
      isMainThreadBusy = !isMainThreadBusy;
    }
    result += `${mainThreadLabelColumn}│${mainThreadTimelineColumn}\n`;

    const tasksByPriority = Array.from(tasks.values()).sort(
      (t1, t2) => t1.priorityLevel - t2.priorityLevel,
    );

    for (const task of tasksByPriority) {
      let label = task.label;
      if (label === undefined) {
        label = 'Task';
      }
      let labelColumn = `Task ${task.id} [${priorityLevelToString(
        task.priorityLevel,
      )}]`;
      labelColumn += ' '.repeat(labelColumnWidth - labelColumn.length - 1);

      // Add empty space up until the start mark
      let timelineColumn = ' '.repeat(task.start / microsecondsPerChar);

      let isRunning = false;
      for (const time of task.runs) {
        const index = time / microsecondsPerChar;
        timelineColumn += (isRunning ? '█' : '░').repeat(
          index - timelineColumn.length,
        );
        isRunning = !isRunning;
      }

      const endIndex = task.end / microsecondsPerChar;
      timelineColumn += (isRunning ? '█' : '░').repeat(
        endIndex - timelineColumn.length,
      );

      if (task.exitStatus !== 'completed') {
        timelineColumn += `🡐 ${task.exitStatus}`;
      }

      result += `${labelColumn}│${timelineColumn}\n`;
    }

    return '\n' + result;
  }

  it('creates a basic flamegraph', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    Scheduler.unstable_advanceTime(100);
    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_advanceTime(300);
        Scheduler.unstable_yieldValue('Yield 1');
        scheduleCallback(
          UserBlockingPriority,
          () => {
            Scheduler.unstable_yieldValue('Yield 2');
            Scheduler.unstable_advanceTime(300);
          },
          {label: 'Bar'},
        );
        Scheduler.unstable_advanceTime(100);
        Scheduler.unstable_yieldValue('Yield 3');
        return () => {
          Scheduler.unstable_yieldValue('Yield 4');
          Scheduler.unstable_advanceTime(300);
        };
      },
      {label: 'Foo'},
    );
    expect(Scheduler).toFlushAndYieldThrough(['Yield 1', 'Yield 3']);
    Scheduler.unstable_advanceTime(100);
    expect(Scheduler).toFlushAndYield(['Yield 2', 'Yield 4']);

    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │██░░░░░░░░██░░░░░░░░░░░░
Task 2 [User-blocking]       │        ░░░░██████
Task 1 [Normal]              │  ████████░░░░░░░░██████
`,
    );
  });

  it('marks when a task is canceled', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task = scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_yieldValue('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.unstable_yieldValue('Yield 2');
      return () => {
        Scheduler.unstable_yieldValue('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });

    expect(Scheduler).toFlushAndYieldThrough(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);

    cancelCallback(task);

    Scheduler.unstable_advanceTime(1000);
    expect(Scheduler).toFlushWithoutYielding();
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████░░🡐 canceled
`,
    );
  });

  it('marks when a task errors', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_advanceTime(300);
      throw Error('Oops');
    });

    expect(Scheduler).toFlushAndThrow('Oops');
    Scheduler.unstable_advanceTime(100);

    Scheduler.unstable_advanceTime(1000);
    expect(Scheduler).toFlushWithoutYielding();
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████🡐 errored
`,
    );
  });

  it('marks when multiple tasks are canceled', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task1 = scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_yieldValue('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.unstable_yieldValue('Yield 2');
      return () => {
        Scheduler.unstable_yieldValue('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });
    const task2 = scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_yieldValue('Yield 3');
      Scheduler.unstable_advanceTime(300);
      Scheduler.unstable_yieldValue('Yield 4');
      return () => {
        Scheduler.unstable_yieldValue('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });

    expect(Scheduler).toFlushAndYieldThrough(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);

    cancelCallback(task1);
    cancelCallback(task2);

    // Advance more time. This should not affect the size of the main
    // thread row, since the Scheduler queue is empty.
    Scheduler.unstable_advanceTime(1000);
    expect(Scheduler).toFlushWithoutYielding();

    // The main thread row should end when the callback is cancelled.
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░██████████████████████
Task 1 [Normal]              │██████░░🡐 canceled
Task 2 [Normal]              │░░░░░░░░🡐 canceled
`,
    );
  });

  it('handles cancelling a task that already finished', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    const task = scheduleCallback(NormalPriority, () => {
      Scheduler.unstable_yieldValue('A');
      Scheduler.unstable_advanceTime(1000);
    });
    expect(Scheduler).toFlushAndYield(['A']);
    cancelCallback(task);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │████████████████████
`,
    );
  });

  it('handles cancelling a task multiple times', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();

    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_yieldValue('A');
        Scheduler.unstable_advanceTime(1000);
      },
      {label: 'A'},
    );
    Scheduler.unstable_advanceTime(200);
    const task = scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_yieldValue('B');
        Scheduler.unstable_advanceTime(1000);
      },
      {label: 'B'},
    );
    Scheduler.unstable_advanceTime(400);
    cancelCallback(task);
    cancelCallback(task);
    cancelCallback(task);
    expect(Scheduler).toFlushAndYield(['A']);
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │████████████░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │░░░░░░░░░░░░████████████████████
Task 2 [Normal]              │    ░░░░░░░░🡐 canceled
`,
    );
  });

  it('handles delayed tasks', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(
      NormalPriority,
      () => {
        Scheduler.unstable_advanceTime(1000);
        Scheduler.unstable_yieldValue('A');
      },
      {
        delay: 1000,
      },
    );
    expect(Scheduler).toFlushWithoutYielding();

    Scheduler.unstable_advanceTime(1000);

    expect(Scheduler).toFlushAndYield(['A']);

    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │████████████████████░░░░░░░░░░░░░░░░░░░░
Task 1 [Normal]              │                    ████████████████████
`,
    );
  });

  it('handles cancelling a delayed task', () => {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    const task = scheduleCallback(
      NormalPriority,
      () => Scheduler.unstable_yieldValue('A'),
      {delay: 1000},
    );
    cancelCallback(task);
    expect(Scheduler).toFlushWithoutYielding();
    expect(stopProfilingAndPrintFlamegraph()).toEqual(
      `
!!! Main thread              │
`,
    );
  });

});
