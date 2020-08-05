jest.useFakeTimers();

import * as React from 'react';

import * as ReactTestUtils from 'react-dom/test-utils';

import { KeyCodes } from '../../Utilities';
import { Autofill, IAutofillState, IAutofill, IAutofillProps } from './index';
import { ReactWrapper, mount } from 'enzyme';
import { mockEvent } from 'office-ui-fabric-react/lib/common/testUtilities';

describe('Autofill', () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const autofillRef = React.createRef<IAutofill>();
  let wrapper: ReactWrapper<IAutofillProps, IAutofillState>;

  afterEach(() => {
    wrapper.unmount();
  });

  it('correctly autofills', () => {
    let updatedText: string | undefined;
    const onInputValueChange = (text: string | undefined): void => {
      updatedText = text;
    };

    wrapper = mount(
      <Autofill
        ref={inputRef}
        componentRef={autofillRef}
        onInputValueChange={onInputValueChange}
        suggestedDisplayValue="hello"
      />,
    );

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hel'));
    expect(updatedText).toBe('hel');
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');
  });

  it('correctly autofills with composable languages', () => {
    let updatedText: string | undefined;
    const onInputValueChange = (text: string | undefined): void => {
      updatedText = text;
    };

    wrapper = mount(
      <Autofill
        ref={inputRef}
        componentRef={autofillRef}
        onInputValueChange={onInputValueChange}
        suggestedDisplayValue="こんにちは"
      />,
    );

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('こん'));
    expect(updatedText).toBe('こん');
    expect(autofillRef.current!.value).toBe('こん');
    expect(inputRef.current!.value).toBe('こんにちは');
  });

  it('does not autofill if suggestedDisplayValue does not match input', () => {
    let updatedText: string | undefined;
    const onInputValueChange = (text: string | undefined): void => {
      updatedText = text;
    };

    wrapper = mount(
      <Autofill
        ref={inputRef}
        componentRef={autofillRef}
        onInputValueChange={onInputValueChange}
        suggestedDisplayValue="hello"
      />,
    );
    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hep'));

    expect(updatedText).toBe('hep');
    expect(autofillRef.current!.value).toBe('hep');
    expect(inputRef.current!.value).toBe('hep');
  });

  it('autofills if left arrow is pressed', () => {
    wrapper = mount(<Autofill ref={inputRef} componentRef={autofillRef} suggestedDisplayValue="hello" />);

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hel'));
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.left, which: KeyCodes.left });
    expect(autofillRef.current!.value).toBe('hello');
    expect(inputRef.current!.value).toBe('hello');
  });

  it('autofills if right arrow is pressed', () => {
    wrapper = mount(<Autofill ref={inputRef} componentRef={autofillRef} suggestedDisplayValue="hello" />);

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hel'));
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.right, which: KeyCodes.right });
    expect(autofillRef.current!.value).toBe('hello');
    expect(inputRef.current!.value).toBe('hello');
  });

  it('does not autofill if up or down is pressed', () => {
    wrapper = mount(<Autofill ref={inputRef} componentRef={autofillRef} suggestedDisplayValue="hello" />);

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hel'));
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.up, which: KeyCodes.up });
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.down, which: KeyCodes.down });
    expect(autofillRef.current!.value).toBe('hel');
    expect(inputRef.current!.value).toBe('hello');
  });

  it('value changes when updateValueInWillReceiveProps is passed in', () => {
    const propsString = 'Updated';
    const receivePropsUpdater = () => {
      return propsString;
    };
    wrapper = mount(
      <Autofill
        ref={inputRef}
        componentRef={autofillRef}
        suggestedDisplayValue=""
        updateValueInWillReceiveProps={receivePropsUpdater}
      />,
    );

    ReactTestUtils.Simulate.input(inputRef.current!, mockEvent('hel'));
    wrapper.setProps({ suggestedDisplayValue: 'hello' });

    expect(autofillRef.current!.value).toBe('Updated');
    expect(inputRef.current!.value).toBe('Updated');
  });

  it('handles composition events', () => {
    wrapper = mount(<Autofill ref={inputRef} componentRef={autofillRef} suggestedDisplayValue="he" />);

    inputRef.current!.value = 'he';
    ReactTestUtils.Simulate.input(inputRef.current!);
    expect(autofillRef.current!.value).toBe('he');

    ReactTestUtils.Simulate.compositionStart(inputRef.current!, {});

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.l, which: KeyCodes.l });
    inputRef.current!.value = 'hel';

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.p, which: KeyCodes.p });
    inputRef.current!.value = 'help';

    ReactTestUtils.Simulate.compositionEnd(inputRef.current!, {});
    inputRef.current!.value = '🆘';

    ReactTestUtils.Simulate.input(inputRef.current!);

    expect(autofillRef.current!.value).toBe('🆘');
  });

  it('handles composition events when multiple compositionEnd events are dispatched without a compositionStart', () => {
    const onInputChange = jest.fn((a: string, b: boolean) => a);
    wrapper = mount(
      <Autofill ref={inputRef} componentRef={autofillRef} onInputChange={onInputChange} suggestedDisplayValue="he" />,
    );

    ReactTestUtils.act(() => {
      inputRef.current!.value = 'hel';
      ReactTestUtils.Simulate.input(inputRef.current!);
      expect(autofillRef.current!.value).toBe('hel');

      ReactTestUtils.Simulate.compositionStart(inputRef.current!, {});

      ReactTestUtils.Simulate.keyDown(inputRef.current!, {
        keyCode: KeyCodes.p,
        which: KeyCodes.p,
      });
      inputRef.current!.value = 'help';
      ReactTestUtils.Simulate.input(inputRef.current!, {
        target: inputRef.current!,
        nativeEvent: {
          isComposing: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      ReactTestUtils.Simulate.compositionEnd(inputRef.current!, {});

      inputRef.current!.value = '🆘';
      ReactTestUtils.Simulate.input(inputRef.current!, {
        target: inputRef.current!,
        nativeEvent: {
          isComposing: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
    });

    jest.runOnlyPendingTimers();

    ReactTestUtils.act(() => {
      ReactTestUtils.Simulate.keyDown(inputRef.current!, {
        keyCode: KeyCodes.m,
        which: KeyCodes.m,
        nativeEvent: {
          isComposing: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      inputRef.current!.value = '🆘m';

      ReactTestUtils.Simulate.input(inputRef.current!, {
        target: inputRef.current!,
        nativeEvent: {
          isComposing: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      ReactTestUtils.Simulate.compositionEnd(inputRef.current!, {});
      inputRef.current!.value = '🆘Ⓜ';
      ReactTestUtils.Simulate.input(inputRef.current!, {
        target: inputRef.current!,
        nativeEvent: {
          isComposing: false,

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      jest.runOnlyPendingTimers();
    });

    expect(onInputChange.mock.calls).toEqual([
      ['hel', false],
      ['help', true],
      ['🆘', true], // from input event
      ['', false], // The blank value here....
      ['🆘', false], // from timeout on compositionEnd event
      ['🆘m', true],
      ['🆘Ⓜ', false], // from input event
      ['🆘Ⓜ', false], // from  timeout on compositionEnd event
    ]);

    expect(autofillRef.current!.value).toBe('🆘Ⓜ');
  });

  it('will call onInputChange w/ composition events', () => {
    const onInputChange = jest.fn((a: string, b: boolean) => a);

    wrapper = mount(
      <Autofill ref={inputRef} componentRef={autofillRef} onInputChange={onInputChange} suggestedDisplayValue="he" />,
    );

    inputRef.current!.value = 'he';
    ReactTestUtils.Simulate.input(inputRef.current!);
    expect(autofillRef.current!.value).toBe('he');

    ReactTestUtils.Simulate.compositionStart(inputRef.current!, {});

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.l, which: KeyCodes.l });
    inputRef.current!.value = 'hel';
    ReactTestUtils.Simulate.input(inputRef.current!!, {});

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.p, which: KeyCodes.p });
    inputRef.current!.value = 'help';
    ReactTestUtils.Simulate.input(inputRef.current!!, {});

    ReactTestUtils.Simulate.compositionEnd(inputRef.current!, {});
    inputRef.current!.value = '🆘';

    ReactTestUtils.Simulate.input(inputRef.current!);

    expect(onInputChange.mock.calls).toEqual([
      ['he', false],
      ['hel', true],
      ['help', true],
      ['🆘', false],
    ]);
  });

  it('will call onInputValueChanged w/ composition events', () => {
    const onInputValueChange = jest.fn((a: string, b: boolean) => {
      // eslint-disable-next-line no-void
      return void 0;
    });

    wrapper = mount(
      <Autofill
        ref={inputRef}
        componentRef={autofillRef}
        onInputValueChange={onInputValueChange}
        suggestedDisplayValue="he"
      />,
    );

    inputRef.current!.value = 'he';
    ReactTestUtils.Simulate.input(inputRef.current!);
    expect(autofillRef.current!.value).toBe('he');

    ReactTestUtils.Simulate.compositionStart(inputRef.current!, {});

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.l, which: KeyCodes.l });
    inputRef.current!.value = 'hel';
    ReactTestUtils.Simulate.input(inputRef.current!!, {});

    ReactTestUtils.Simulate.keyDown(inputRef.current!, { keyCode: KeyCodes.p, which: KeyCodes.p });
    inputRef.current!.value = 'help';
    ReactTestUtils.Simulate.input(inputRef.current!!, {});

    ReactTestUtils.Simulate.compositionEnd(inputRef.current!, {});
    inputRef.current!.value = '🆘';

    ReactTestUtils.Simulate.input(inputRef.current!);

    expect(onInputValueChange.mock.calls).toEqual([
      ['he', false],
      ['hel', true],
      ['help', true],
      ['🆘', false],
    ]);
  });
});
