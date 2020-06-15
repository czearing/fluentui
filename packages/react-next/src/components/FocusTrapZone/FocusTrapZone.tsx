import * as React from 'react';
import {
  elementContains,
  getNativeProps,
  divProperties,
  getFirstTabbable,
  getLastTabbable,
  getNextElement,
  getDocument,
  focusAsync,
  on,
} from '../../Utilities';
import { IFocusTrapZone, IFocusTrapZoneProps } from './FocusTrapZone.types';

const useComponentRef = (
  props: IFocusTrapZoneProps,
  previouslyFocusedElementInTrapZone: HTMLElement | undefined,
  root: React.RefObject<HTMLDivElement>,
  firstBumper: React.RefObject<HTMLDivElement>,
  lastBumper: React.RefObject<HTMLDivElement>,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get previouslyFocusedElementInTrapZone() {
        return previouslyFocusedElementInTrapZone;
      },
      focus() {
        const { focusPreviouslyFocusedInnerElement, firstFocusableSelector } = props;

        if (
          focusPreviouslyFocusedInnerElement &&
          previouslyFocusedElementInTrapZone &&
          elementContains(root.current, previouslyFocusedElementInTrapZone)
        ) {
          // focus on the last item that had focus in the zone before we left the zone
          if (
            !(
              previouslyFocusedElementInTrapZone === firstBumper.current ||
              previouslyFocusedElementInTrapZone === lastBumper.current
            )
          ) {
            focusAsync(previouslyFocusedElementInTrapZone);
          }
          return;
        }
        const focusSelector =
          typeof firstFocusableSelector === 'string'
            ? firstFocusableSelector
            : firstFocusableSelector && firstFocusableSelector();

        let firstFocusableChild: HTMLElement | null = null;

        if (root.current) {
          if (focusSelector) {
            firstFocusableChild = root.current.querySelector('.' + focusSelector);
          }
          // Fall back to first element if query selector did not match any elements.
          if (!firstFocusableChild) {
            firstFocusableChild = getNextElement(
              root.current,
              root.current.firstChild as HTMLElement,
              false,
              false,
              false,
              true,
            );
          }
        }

        if (firstFocusableChild) {
          if (firstFocusableChild) {
            if (!(firstFocusableChild === firstBumper.current || firstFocusableChild === lastBumper.current)) {
              focusAsync(firstFocusableChild);
            }
          }
        }
      },
    }),
    [previouslyFocusedElementInTrapZone],
  );
};

interface IFocusTrapZoneState {
  disposeFocusHandler: (() => void) | undefined;
  disposeClickHandler: (() => void) | undefined;
  previouslyFocusedElementOutsideTrapZone: HTMLElement | undefined;
  previouslyFocusedElementInTrapZone: HTMLElement | undefined;
  focusStack: IFocusTrapZone[];
  hasFocus: boolean;
}

const COMPONENT_NAME = 'FocusTrapZone';
export const FocusTrapZone: React.FunctionComponent<IFocusTrapZoneProps> = (props: IFocusTrapZoneProps) => {
  const root = React.useRef<HTMLDivElement>(null);
  const firstBumper = React.useRef<HTMLDivElement>(null);
  const lastBumper = React.useRef<HTMLDivElement>(null);
  const doc = getDocument(root.current);
  const { className, disabled = false, ariaLabelledBy } = props;
  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);

  const [state] = React.useState<IFocusTrapZoneState>({
    previouslyFocusedElementOutsideTrapZone: undefined,
    previouslyFocusedElementInTrapZone: undefined,
    focusStack: [],
    disposeFocusHandler: undefined,
    disposeClickHandler: undefined,
    hasFocus: false,
  });

  const bumperProps = {
    style: {
      pointerEvents: 'none',
      position: 'fixed', // 'fixed' prevents browsers from scrolling to bumpers when viewport does not contain them
    },
    tabIndex: disabled ? -1 : 0, // make bumpers tabbable only when enabled
    'data-is-visible': true,
  } as React.HTMLAttributes<HTMLDivElement>;

  const onRootFocus = (ev: React.FocusEvent<HTMLDivElement>) => {
    if (props.onFocus) {
      props.onFocus(ev);
    }
    state.hasFocus = true;
  };

  const onRootBlur = (ev: React.FocusEvent<HTMLDivElement>) => {
    if (props.onBlur) {
      props.onBlur(ev);
    }
    let relatedTarget = ev.relatedTarget;
    if (ev.relatedTarget === null) {
      // In IE11, due to lack of support, event.relatedTarget is always
      // null making every onBlur call to be "outside" of the ComboBox
      // even when it's not. Using document.activeElement is another way
      // for us to be able to get what the relatedTarget without relying
      // on the event
      relatedTarget = useGetDocument().activeElement as Element;
    }
    if (!elementContains(root.current, relatedTarget as HTMLElement)) {
      state.hasFocus = false;
    }
  };

  const onFirstBumperFocus = () => {
    onBumperFocus(true);
  };

  const onLastBumperFocus = () => {
    onBumperFocus(false);
  };

  const onBumperFocus = (isFirstBumper: boolean) => {
    if (props.disabled) {
      return;
    }

    const currentBumper = (isFirstBumper === state.hasFocus ? lastBumper.current : firstBumper.current) as HTMLElement;

    if (root.current) {
      const nextFocusable =
        isFirstBumper === state.hasFocus
          ? getLastTabbable(root.current, currentBumper, true, false)
          : getFirstTabbable(root.current, currentBumper, true, false);

      if (nextFocusable) {
        if (isBumper(nextFocusable)) {
          // This can happen when FTZ contains no tabbable elements.
          // focus will take care of finding a focusable element in FTZ.
          this.focus();
        } else {
          nextFocusable.focus();
        }
      }
    }
  };

  const bringFocusIntoZone = (): void => {
    const { disableFirstFocus = false } = props;
    if (disabled) {
      return;
    }
    state.focusStack.push();

    state.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss
      ? elementToFocusOnDismiss
      : (useGetDocument().activeElement as HTMLElement);
    if (!disableFirstFocus && !elementContains(root.current, state.previouslyFocusedElementOutsideTrapZone)) {
      focus();
    }
  };

  const useFocusAsync = (element: HTMLElement): void => {
    if (!isBumper(element)) {
      focusAsync(element);
    }
  };

  const returnFocusToInitiator = (): void => {
    const { ignoreExternalFocusing } = props;
    state.focusStack = state.focusStack.filter((value: IFocusTrapZone) => {
      return this !== value;
    });
    if (doc) {
      const activeElement = doc.activeElement as HTMLElement;
      if (
        !ignoreExternalFocusing &&
        state.previouslyFocusedElementOutsideTrapZone &&
        typeof state.previouslyFocusedElementOutsideTrapZone.focus === 'function' &&
        (elementContains(root.current, activeElement) || activeElement === doc.body)
      ) {
        useFocusAsync(state.previouslyFocusedElementOutsideTrapZone);
      }
    }
  };

  const updateEventHandlers = (newProps: IFocusTrapZoneProps): void => {
    const { isClickableOutsideFocusTrap = false, forceFocusInsideTrap = true } = newProps;

    if (forceFocusInsideTrap && !state.disposeFocusHandler) {
      state.disposeFocusHandler = on(window, 'focus', forceFocusInTrap, true);
    } else if (!forceFocusInsideTrap && state.disposeFocusHandler) {
      state.disposeFocusHandler();
      state.disposeFocusHandler = undefined;
    }

    if (!isClickableOutsideFocusTrap && !state.disposeClickHandler) {
      state.disposeClickHandler = on(window, 'click', forceClickInTrap, true);
    } else if (isClickableOutsideFocusTrap && state.disposeClickHandler) {
      state.disposeClickHandler();
      state.disposeClickHandler = undefined;
    }
  };

  const onFocusCapture = (ev: React.FocusEvent<HTMLDivElement>) => {
    if (props.onFocusCapture) {
      props.onFocusCapture(ev);
    }

    if (ev.target !== ev.currentTarget && !isBumper(ev.target)) {
      // every time focus changes within the trap zone, remember the focused element so that
      // it can be restored if focus leaves the pane and returns via keystroke (i.e. via a call to this.focus(true))
      state.previouslyFocusedElementInTrapZone = ev.target as HTMLElement;
    }
  };

  const isBumper = (element: HTMLElement): boolean => {
    return element === firstBumper.current || element === lastBumper.current;
  };

  const forceFocusInTrap = (ev: FocusEvent): void => {
    if (props.disabled) {
      return;
    }

    if (state.focusStack.length && this === state.focusStack[state.focusStack.length - 1]) {
      const focusedElement = useGetDocument().activeElement as HTMLElement;

      if (!elementContains(root.current, focusedElement)) {
        focus();
        state.hasFocus = true; // set focus here since we stop event propagation
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  const forceClickInTrap = (ev: MouseEvent): void => {
    if (props.disabled) {
      return;
    }

    if (state.focusStack.length && this === state.focusStack[state.focusStack.length - 1]) {
      const clickedElement = ev.target as HTMLElement;

      if (clickedElement && !elementContains(root.current, clickedElement)) {
        focus();
        state.hasFocus = true; // set focus here since we stop event propagation
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  const useGetDocument = (): Document => {
    return getDocument(root.current)!;
  };

  const useUnmount = (unmountFunction: () => void) => {
    const unmountRef = React.useRef(unmountFunction);

    unmountRef.current = unmountFunction;

    React.useEffect(
      () => () => {
        if (unmountRef.current) {
          unmountRef.current();
        }
      },
      [],
    );
  };

  returnFocusToInitiator();
  bringFocusIntoZone();

  const { elementToFocusOnDismiss } = props;
  if (elementToFocusOnDismiss && state.previouslyFocusedElementOutsideTrapZone !== elementToFocusOnDismiss) {
    state.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss;
  }
  updateEventHandlers(props);

  useUnmount(() => {
    if (doc) {
      // don't handle return focus unless forceFocusInsideTrap is true or focus is still within FocusTrapZone
      if (
        !props.disabled ||
        props.forceFocusInsideTrap ||
        !elementContains(root.current, doc.activeElement as HTMLElement)
      ) {
        returnFocusToInitiator();
      }
    }
    // Dispose of event handlers so their closures can be garbage-collected
    if (state.disposeClickHandler) {
      state.disposeClickHandler();
      state.disposeClickHandler = undefined;
    }

    if (state.disposeFocusHandler) {
      state.disposeFocusHandler();
      state.disposeFocusHandler = undefined;
    }

    // Dispose of element references so the DOM Nodes can be garbage-collected
    delete state.previouslyFocusedElementInTrapZone;
    delete state.previouslyFocusedElementOutsideTrapZone;
  });

  const prevForceFocusInsideTrap = props.forceFocusInsideTrap !== undefined ? props.forceFocusInsideTrap : true;
  const newForceFocusInsideTrap = props.forceFocusInsideTrap !== undefined ? props.forceFocusInsideTrap : true;
  const prevDisabled = props.disabled !== undefined ? props.disabled : false;
  const newDisabled = props.disabled !== undefined ? props.disabled : false;

  if ((!prevForceFocusInsideTrap && newForceFocusInsideTrap) || (prevDisabled && !newDisabled)) {
    // Transition from forceFocusInsideTrap / FTZ disabled to enabled.
    // Emulate what happens when a FocusTrapZone gets mounted.
    bringFocusIntoZone();
  } else if ((prevForceFocusInsideTrap && !newForceFocusInsideTrap) || (!prevDisabled && newDisabled)) {
    // Transition from forceFocusInsideTrap / FTZ enabled to disabled.
    // Emulate what happens when a FocusTrapZone gets unmounted.
    returnFocusToInitiator();
  }

  useComponentRef(props, state.previouslyFocusedElementInTrapZone, root, firstBumper, lastBumper);

  return (
    <div
      {...divProps}
      className={className}
      ref={root}
      aria-labelledby={ariaLabelledBy}
      onFocusCapture={onFocusCapture}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
    >
      <div {...bumperProps} ref={firstBumper} onFocus={onFirstBumperFocus} />
      {props.children}
      <div {...bumperProps} ref={lastBumper} onFocus={onLastBumperFocus} />
    </div>
  );
};
FocusTrapZone.displayName = COMPONENT_NAME;
