import * as React from 'react';
import { safeCreate, safeMount } from '@fluentui/test-utilities';
import { resetIds, KeyCodes } from '@fluentui/utilities';
import { Slider } from './Slider';
import { isConformant } from '../../common/isConformant';
import { act } from 'react-dom/test-utils';
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Slider', () => {
  beforeEach(() => {
    resetIds();
  });

  // isConformant({
  //   Component: Slider,
  //   displayName: 'Slider',
  //   disabledTests: ['kebab-aria-attributes'],
  // });

  it('renders Slider correctly', () => {
    safeCreate(<Slider defaultValue={5} />, component => {
      const tree = component.toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  it('correctly handles (id) prop', () => {
    safeMount(<Slider id="test_id" />, component => {
      expect(component.find('.ms-Slider-root').getDOMNode().id).toEqual('test_id');
    });
  });

  it('correctly applies the (defaultValue) prop', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={0} min={0} max={100} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      expect(sliderRef.current!.value).toEqual(0);
    });
  });

  it('correctly applies the (value) prop', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider value={0} min={0} max={100} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      expect(sliderRef.current!.value).toEqual(0);
    });
  });

  it('correctly handles an initial (defaultValue) that is out of bounds', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={-10} min={0} max={100} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      expect(sliderRef.current.value).toEqual(0);
    });
  });

  // it('correctly handles an initial (value) that is out of bounds', () => {
  //   let sliderRef: any;

  //   const SliderTestComponent = () => {
  //     sliderRef = React.useRef(null);

  //     return <Slider value={-10} min={0} max={100} ref={sliderRef} />;
  //   };

  //   safeMount(<SliderTestComponent />, component => {
  //     expect(sliderRef.current.value).toEqual(0);
  //   });
  // });

  it('correctly calls (onChange) when the mouse is moved', () => {
    let sliderRef: any;
    const onChange = jest.fn();

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={5} onChange={onChange} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      expect(onChange).toHaveBeenCalledTimes(0);

      sliderRail.getDOMNode().getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 } as DOMRect);

      sliderRail.simulate('mousedown', { type: 'mousedown', clientX: 0, clientY: 0 });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(0);

      expect(sliderRef.current!.value).toBe(0);
    });
  });

  it('correctly slides to (min/max) and executes onChange', () => {
    let sliderRef: any;
    const onChange = jest.fn();

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={2} onChange={onChange} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      expect(onChange).toHaveBeenCalledTimes(0);

      sliderRail.getDOMNode().getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 } as DOMRect);

      sliderRail.simulate('mousedown', { type: 'mousedown', clientX: 110, clientY: 0 });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(10);
      expect(sliderRef.current!.value).toBe(10);

      sliderRail.simulate('mousedown', { type: 'mousedown', clientX: -10, clientY: 0 });

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0]).toEqual(0);
      expect(sliderRef.current!.value).toBe(0);
    });
  });

  it('correctly handles (keydown) events', () => {
    let sliderRef: any;
    const onChange = jest.fn();

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={50} min={0} max={100} onChange={onChange} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      expect(onChange).toHaveBeenCalledTimes(0);

      sliderRail.simulate('keydown', { which: KeyCodes.down });
      expect(sliderRef.current!.value).toBe(49);

      sliderRail.simulate('keydown', { which: KeyCodes.up });
      expect(sliderRef.current!.value).toBe(50);

      sliderRail.simulate('keydown', { which: KeyCodes.left });
      expect(sliderRef.current!.value).toBe(49);

      sliderRail.simulate('keydown', { which: KeyCodes.right });
      expect(sliderRef.current!.value).toBe(50);

      sliderRail.simulate('keydown', { which: KeyCodes.pageUp });
      expect(sliderRef.current!.value).toBe(60);

      sliderRail.simulate('keydown', { which: KeyCodes.pageDown });
      expect(sliderRef.current!.value).toBe(50);

      sliderRail.simulate('keydown', { which: KeyCodes.home });
      expect(sliderRef.current!.value).toBe(0);

      sliderRail.simulate('keydown', { which: KeyCodes.end });
      expect(sliderRef.current!.value).toBe(100);

      sliderRail.simulate('keydown', { which: KeyCodes.left, shiftKey: true });
      expect(sliderRef.current!.value).toBe(90);

      sliderRail.simulate('keydown', { which: KeyCodes.right, shiftKey: true });
      expect(sliderRef.current!.value).toBe(100);

      expect(onChange).toHaveBeenCalledTimes(10);
    });
  });

  it('does not update when the controlled (value) prop is provided', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider value={50} min={0} max={100} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      sliderRail.simulate('keydown', { which: KeyCodes.up });

      expect(sliderRef.current.value).toEqual(50);
    });
  });

  it('calls (onChange) with the correct value', () => {
    const onChange = jest.fn();
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider value={50} min={0} max={100} onChange={onChange} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      sliderRail.simulate('keydown', { which: KeyCodes.up });
      sliderRail.simulate('keydown', { which: KeyCodes.up });
      sliderRail.simulate('keydown', { which: KeyCodes.up });

      expect(sliderRef.current.value).toEqual(50);
      expect(onChange.mock.calls[2][0]).toEqual(51);
    });
  });

  it('correctly handles a negative (step) prop', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={50} min={0} max={100} step={-3} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      sliderRail.simulate('keydown', { which: KeyCodes.up });
      expect(sliderRef.current?.value).toEqual(47);
    });
  });

  it('correctly handles a decimal (step) prop', () => {
    let sliderRef: any;

    const SliderTestComponent = () => {
      sliderRef = React.useRef(null);

      return <Slider defaultValue={50} min={0} max={100} step={0.001} ref={sliderRef} />;
    };

    safeMount(<SliderTestComponent />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      sliderRail.simulate('keydown', { which: KeyCodes.up });
      expect(sliderRef.current?.value).toEqual(50.001);
    });
  });

  it('correctly handles (role) prop', () => {
    safeMount(<Slider role="test" />, component => {
      const sliderRole = component.find('.ms-Slider-root').prop('role');

      expect(sliderRole).toEqual('test');
    });
  });

  it('correctly applies Slider (role) to thumb', () => {
    safeMount(<Slider />, component => {
      const thumbRole = component.find('.ms-Slider-thumb').prop('role');

      expect(thumbRole).toEqual('slider');
    });
  });

  it('correctly applies (aria-valuetext)', () => {
    safeMount(<Slider />, component => {
      const sliderThumb = component.find('.ms-Slider-thumb').prop('aria-valuetext');

      expect(sliderThumb).toEqual('0');
    });

    const values = ['small', 'medium', 'large'];
    const selected = 1;
    const getTextValue = (value: number) => values[value];

    safeMount(<Slider value={selected} ariaValueText={getTextValue} />, component => {
      const sliderThumb = component.find('.ms-Slider-thumb').prop('aria-valuetext');

      expect(sliderThumb).toEqual(values[selected]);
    });
  });

  it('correctly applies (aria-valuenow)', () => {
    safeMount(<Slider defaultValue={3} />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      sliderRail.simulate('keydown', { which: KeyCodes.right });

      expect(component.find('.ms-Slider-thumb').prop('aria-valuenow')).toEqual(4);

      sliderRail.getDOMNode().getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 } as DOMRect);

      sliderRail.simulate('mousedown', { type: 'mousedown', clientX: 87, clientY: 32 });

      expect(component.find('.ms-Slider-thumb').prop('aria-valuenow')).toEqual(8.7);
    });
  });

  it('correctly applies (aria-valuemax)', () => {
    safeMount(<Slider max={3} />, component => {
      expect(component.find('.ms-Slider-thumb').prop('aria-valuemax')).toEqual(3);
    });
  });

  it('correctly applies (aria-valuemax)', () => {
    safeMount(<Slider min={-1} />, component => {
      expect(component.find('.ms-Slider-thumb').prop('aria-valuemin')).toEqual(-1);
    });
  });

  it('correctly handles (onKeyDown) callback', () => {
    const eventHandler = jest.fn();

    safeMount(<Slider role="test" onKeyDown={eventHandler} />, component => {
      const sliderRail = component.find('.ms-Slider-rail');

      expect(eventHandler).toBeCalledTimes(0);
      sliderRail.simulate('keydown', { which: KeyCodes.up });
      expect(eventHandler).toBeCalledTimes(1);
    });
  });
});
