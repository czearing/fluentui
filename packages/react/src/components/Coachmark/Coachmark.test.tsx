import * as React from 'react';
import { Coachmark } from './Coachmark';
import { safeCreate, safeMount } from '@fluentui/test-utilities';
import { resetIds } from '@fluentui/utilities';
import { isConformant } from '../../common/isConformant';
import * as path from 'path';

const ReactDOM = require('react-dom');

describe('Coachmark', () => {
  const createPortal = ReactDOM.createPortal;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    resetIds();
  });

  afterEach(() => {
    ReactDOM.createPortal = createPortal;
  });

  // Conformance Tests:
  isConformant({
    Component: Coachmark,
    displayName: 'Coachmark',
    componentPath: path.join(__dirname, 'Coachmark.ts'),
    disabledTests: ['component-handles-classname', 'component-has-root-ref', 'component-handles-ref'],
  });

  // Snapshot Tests:
  it('renders Coachmark (correctly)', () => {
    ReactDOM.createPortal = jest.fn(element => element);

    safeCreate(
      <Coachmark className={'test-className'} target="test-target">
        This is a test
      </Coachmark>,
      component => {
        const tree = component!.toJSON();
        expect(tree).toMatchSnapshot();
      },
    );
  });

  it('renders Coachmark (isCollapsed)', () => {
    ReactDOM.createPortal = jest.fn(element => element);

    safeCreate(
      <Coachmark isCollapsed={false} className={'test-className'} target="test-target">
        This is a test
      </Coachmark>,
      component => {
        const tree = component!.toJSON();
        expect(tree).toMatchSnapshot();
      },
    );
  });

  it('renders Coachmark (color properties)', () => {
    ReactDOM.createPortal = jest.fn(element => element);

    safeCreate(<Coachmark beaconColorOne="green" beaconColorTwo="blue" color="red" target="test" />, component => {
      const tree = component!.toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  // Behavior Tests:
  // it('correctly handles (onMouseMove)', () => {
  //   const onMouseMove = jest.fn();

  //   safeMount(<Coachmark onMouseMove={onMouseMove} target="test-target" />, component => {
  //     expect(onMouseMove).toHaveBeenCalledTimes(0);
  //     component.update();
  //     component.simulate('mousedown', { type: 'mousedown', clientX: 1000, clientY: 1000, buttons: 1 });
  //     component.simulate('mousemove', { type: 'mousemove', clientX: 2000, clientY: 1000 });
  //     component.simulate('mouseup');

  //     expect(onMouseMove).toHaveBeenCalledTimes(1);

  //     // component.simulate('mousemove', { type: 'mousemove', clientX: 0, clientY: 20 });
  //     // expect(onMouseMove).toHaveBeenCalledTimes(1);
  //   });
  // });

  // it('correctly handles (onDismiss)', () => {
  //   const onDismiss = jest.fn();

  //   safeMount(<Coachmark onDismiss={onDismiss} target="test-target" />, component => {
  //     expect(onDismiss).toHaveBeenCalledTimes(0);

  //     component.setProps({ isCollapsed: false });
  //     component.update();
  //     expect(onDismiss).toHaveBeenCalledTimes(1);
  //   });
  // });

  it('correctly handles (onAnimationOpenStart)', () => {
    const onAnimationOpenStart = jest.fn();

    safeMount(<Coachmark onAnimationOpenStart={onAnimationOpenStart} target="test-target" />, component => {
      expect(onAnimationOpenStart).toHaveBeenCalledTimes(0);

      jest.runOnlyPendingTimers();

      expect(onAnimationOpenStart).toHaveBeenCalledTimes(1);

      jest.runOnlyPendingTimers();

      expect(onAnimationOpenStart).toHaveBeenCalledTimes(1);
    });
  });

  // Accessibility Tests:
  it('correctly applies (ariaAlertText)', () => {
    safeMount(<Coachmark ariaAlertText="aria alert " target="test-target" />, component => {
      expect(component.find('[role="alert"]').getDOMNode()).toBeDefined();
    });
  });

  it('correctly applies (ariaLabelBy)', () => {
    safeMount(
      <Coachmark ariaLabelledBy="aria label" ariaLabelledByText="aria text" target="test-target" />,
      component => {
        expect(component.find('[role="dialog"]').getDOMNode().getAttribute('aria-labelledby')).toBe('aria label');
        expect(component.find('[id="aria label"]').text()).toBe('aria text');
      },
    );
  });

  it('correctly applies (ariaDescribedBy)', () => {
    safeMount(
      <Coachmark ariaDescribedBy="aria description" ariaDescribedByText="aria description text" target="test-target" />,
      component => {
        expect(component.find('[role="dialog"]').getDOMNode().getAttribute('aria-describedby')).toBe(
          'aria description',
        );
        expect(component.find('[id="aria description"]').text()).toBe('aria description text');
      },
    );
  });
});
