/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {
  dispatchPointerCancel,
  dispatchPointerHoverEnter,
  dispatchPointerHoverExit,
  dispatchPointerHoverMove,
  dispatchTouchTap,
  setPointerEvent,
} from '../test-utils';

let React;
let ReactFeatureFlags;
let ReactDOM;
let HoverResponder;
let useHoverResponder;

function initializeModules(hasPointerEvents) {
  jest.resetModules();
  setPointerEvent(hasPointerEvents);
  ReactFeatureFlags = require('shared/ReactFeatureFlags');
  ReactFeatureFlags.enableFlareAPI = true;
  ReactFeatureFlags.enableUserBlockingEvents = true;
  React = require('react');
  ReactDOM = require('react-dom');
  HoverResponder = require('react-events/hover').HoverResponder;
  useHoverResponder = require('react-events/hover').useHoverResponder;
}

const forcePointerEvents = true;
const table = [[forcePointerEvents], [!forcePointerEvents]];

describe.each(table)('Hover responder', hasPointerEvents => {
  let container;

  beforeEach(() => {
    initializeModules(hasPointerEvents);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.render(null, container);
    document.body.removeChild(container);
    container = null;
  });

  describe('disabled', () => {
    let onHoverChange, onHoverStart, onHoverMove, onHoverEnd, ref;

    beforeEach(() => {
      onHoverChange = jest.fn();
      onHoverStart = jest.fn();
      onHoverMove = jest.fn();
      onHoverEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useHoverResponder({
          disabled: true,
          onHoverChange,
          onHoverStart,
          onHoverMove,
          onHoverEnd,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
    });

    it('does not call callbacks', () => {
      const target = ref.current;
      dispatchPointerHoverEnter(target);
      dispatchPointerHoverExit(target);
      expect(onHoverChange).not.toBeCalled();
      expect(onHoverStart).not.toBeCalled();
      expect(onHoverMove).not.toBeCalled();
      expect(onHoverEnd).not.toBeCalled();
    });
  });

  describe('onHoverStart', () => {
    let onHoverStart, ref;

    beforeEach(() => {
      onHoverStart = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useHoverResponder({
          onHoverStart: onHoverStart,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
    });

    it('is called for mouse pointers', () => {
      const target = ref.current;
      dispatchPointerHoverEnter(target);
      expect(onHoverStart).toHaveBeenCalledTimes(1);
    });

    it('is not called for touch pointers', () => {
      const target = ref.current;
      dispatchTouchTap(target);
      expect(onHoverStart).not.toBeCalled();
    });

    it('is called if a mouse pointer is used after a touch pointer', () => {
      const target = ref.current;
      dispatchTouchTap(target);
      dispatchPointerHoverEnter(target);
      expect(onHoverStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('onHoverChange', () => {
    let onHoverChange, ref;

    beforeEach(() => {
      onHoverChange = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useHoverResponder({
          onHoverChange,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
    });

    it('is called for mouse pointers', () => {
      const target = ref.current;
      dispatchPointerHoverEnter(target);
      expect(onHoverChange).toHaveBeenCalledTimes(1);
      expect(onHoverChange).toHaveBeenCalledWith(true);
      dispatchPointerHoverExit(target);
      expect(onHoverChange).toHaveBeenCalledTimes(2);
      expect(onHoverChange).toHaveBeenCalledWith(false);
    });

    it('is not called for touch pointers', () => {
      const target = ref.current;
      dispatchTouchTap(target);
      expect(onHoverChange).not.toBeCalled();
    });
  });

  describe('onHoverEnd', () => {
    let onHoverEnd, ref;

    beforeEach(() => {
      onHoverEnd = jest.fn();
      ref = React.createRef();
      const Component = () => {
        const listener = useHoverResponder({
          onHoverEnd,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);
    });

    it('is called for mouse pointers', () => {
      const target = ref.current;
      dispatchPointerHoverEnter(target);
      dispatchPointerHoverExit(target);
      expect(onHoverEnd).toHaveBeenCalledTimes(1);
    });

    if (hasPointerEvents) {
      it('is called once for cancelled mouse pointers', () => {
        const target = ref.current;
        dispatchPointerHoverEnter(target);
        dispatchPointerCancel(target);
        expect(onHoverEnd).toHaveBeenCalledTimes(1);

        // only called once if cancel follows exit
        onHoverEnd.mockReset();
        dispatchPointerHoverEnter(target);
        dispatchPointerHoverExit(target);
        dispatchPointerCancel(target);
        expect(onHoverEnd).toHaveBeenCalledTimes(1);
      });
    }

    it('is not called for touch pointers', () => {
      const target = ref.current;
      dispatchTouchTap(target);
      expect(onHoverEnd).not.toBeCalled();
    });
  });

  describe('onHoverMove', () => {
    it('is called after the active pointer moves"', () => {
      const onHoverMove = jest.fn();
      const ref = React.createRef();
      const Component = () => {
        const listener = useHoverResponder({
          onHoverMove,
        });
        return <div ref={ref} listeners={listener} />;
      };
      ReactDOM.render(<Component />, container);

      const target = ref.current;
      dispatchPointerHoverEnter(target);
      dispatchPointerHoverMove(target, {from: {x: 0, y: 0}, to: {x: 1, y: 1}});
      expect(onHoverMove).toHaveBeenCalledTimes(2);
      expect(onHoverMove).toHaveBeenCalledWith(
        expect.objectContaining({type: 'hovermove'}),
      );
    });
  });

  describe('nested Hover components', () => {
    it('not propagate by default', () => {
      const events = [];
      const innerRef = React.createRef();
      const outerRef = React.createRef();
      const createEventHandler = msg => () => {
        events.push(msg);
      };

      const Inner = () => {
        const listener = useHoverResponder({
          onHoverStart: createEventHandler('inner: onHoverStart'),
          onHoverEnd: createEventHandler('inner: onHoverEnd'),
          onHoverChange: createEventHandler('inner: onHoverChange'),
        });
        return <div ref={innerRef} listeners={listener} />;
      };

      const Outer = () => {
        const listener = useHoverResponder({
          onHoverStart: createEventHandler('outer: onHoverStart'),
          onHoverEnd: createEventHandler('outer: onHoverEnd'),
          onHoverChange: createEventHandler('outer: onHoverChange'),
        });
        return (
          <div ref={outerRef} listeners={listener}>
            <Inner />
          </div>
        );
      };
      ReactDOM.render(<Outer />, container);

      const innerTarget = innerRef.current;
      const outerTarget = outerRef.current;

      dispatchPointerHoverEnter(outerTarget, {relatedTarget: container});
      dispatchPointerHoverExit(outerTarget, {relatedTarget: innerTarget});
      dispatchPointerHoverEnter(innerTarget, {relatedTarget: outerTarget});
      dispatchPointerHoverExit(innerTarget, {relatedTarget: outerTarget});
      dispatchPointerHoverEnter(outerTarget, {relatedTarget: innerTarget});
      dispatchPointerHoverExit(outerTarget, {relatedTarget: container});

      expect(events).toEqual([
        'outer: onHoverStart',
        'outer: onHoverChange',
        'outer: onHoverEnd',
        'outer: onHoverChange',
        'inner: onHoverStart',
        'inner: onHoverChange',
        'inner: onHoverEnd',
        'inner: onHoverChange',
        'outer: onHoverStart',
        'outer: onHoverChange',
        'outer: onHoverEnd',
        'outer: onHoverChange',
      ]);
    });
  });

  it('expect displayName to show up for event component', () => {
    expect(HoverResponder.displayName).toBe('Hover');
  });

  it('should correctly pass through event properties', () => {
    const timeStamps = [];
    const ref = React.createRef();
    const eventLog = [];
    const logEvent = event => {
      const propertiesWeCareAbout = {
        x: event.x,
        y: event.y,
        pageX: event.pageX,
        pageY: event.pageY,
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
        target: event.target,
        timeStamp: event.timeStamp,
        type: event.type,
      };
      timeStamps.push(event.timeStamp);
      eventLog.push(propertiesWeCareAbout);
    };
    const Component = () => {
      const listener = useHoverResponder({
        onHoverStart: logEvent,
        onHoverEnd: logEvent,
        onHoverMove: logEvent,
      });
      return <div ref={ref} listeners={listener} />;
    };
    ReactDOM.render(<Component />, container);

    const target = ref.current;

    dispatchPointerHoverEnter(target, {x: 10, y: 10});
    dispatchPointerHoverMove(target, {
      from: {x: 10, y: 10},
      to: {x: 20, y: 20},
    });
    dispatchPointerHoverExit(target, {x: 20, y: 20});

    expect(eventLog).toEqual([
      {
        x: 10,
        y: 10,
        pageX: 10,
        pageY: 10,
        clientX: 10,
        clientY: 10,
        target,
        timeStamp: timeStamps[0],
        type: 'hoverstart',
        pointerType: 'mouse',
      },
      {
        x: 10,
        y: 10,
        pageX: 10,
        pageY: 10,
        clientX: 10,
        clientY: 10,
        target,
        timeStamp: timeStamps[1],
        type: 'hovermove',
        pointerType: 'mouse',
      },
      {
        x: 20,
        y: 20,
        pageX: 20,
        pageY: 20,
        clientX: 20,
        clientY: 20,
        target,
        timeStamp: timeStamps[2],
        type: 'hovermove',
        pointerType: 'mouse',
      },
      {
        x: 20,
        y: 20,
        pageX: 20,
        pageY: 20,
        clientX: 20,
        clientY: 20,
        target,
        timeStamp: timeStamps[3],
        type: 'hoverend',
        pointerType: 'mouse',
      },
    ]);
  });
});
