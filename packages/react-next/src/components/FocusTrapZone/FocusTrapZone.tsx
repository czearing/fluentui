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
  previouslyFocusedElementInTrapZone: HTMLElement,
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

export const FocusTrapZone: React.FunctionComponent = (props: IFocusTrapZoneProps) => {
  let focusStack: IFocusTrapZone[] = [];
  const root = React.useRef<HTMLDivElement>(null);
  const firstBumper = React.useRef<HTMLDivElement>(null);
  const lastBumper = React.useRef<HTMLDivElement>(null);
  const doc = getDocument(root.current);
  let hasFocus: boolean = false;
  let previouslyFocusedElementOutsideTrapZone: HTMLElement;
  let previouslyFocusedElementInTrapZone: HTMLElement;
  let disposeFocusHandler: (() => void) | undefined;
  let disposeClickHandler: (() => void) | undefined;

  const { className, disabled = false, ariaLabelledBy } = props;

  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);

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
    hasFocus = true;
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
      hasFocus = false;
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

    const currentBumper = (isFirstBumper === hasFocus ? lastBumper.current : firstBumper.current) as HTMLElement;

    if (root.current) {
      const nextFocusable =
        isFirstBumper === hasFocus
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
    focusStack.push();

    previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss
      ? elementToFocusOnDismiss
      : (useGetDocument().activeElement as HTMLElement);
    if (!disableFirstFocus && !elementContains(root.current, previouslyFocusedElementOutsideTrapZone)) {
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
    focusStack = focusStack.filter((value: IFocusTrapZone) => {
      return this !== value;
    });
    if (doc) {
      const activeElement = doc.activeElement as HTMLElement;
      if (
        !ignoreExternalFocusing &&
        previouslyFocusedElementOutsideTrapZone &&
        typeof previouslyFocusedElementOutsideTrapZone.focus === 'function' &&
        (elementContains(root.current, activeElement) || activeElement === doc.body)
      ) {
        useFocusAsync(previouslyFocusedElementOutsideTrapZone);
      }
    }
  };

  const updateEventHandlers = (newProps: IFocusTrapZoneProps): void => {
    const { isClickableOutsideFocusTrap = false, forceFocusInsideTrap = true } = newProps;

    if (forceFocusInsideTrap && !disposeFocusHandler) {
      disposeFocusHandler = on(window, 'focus', forceFocusInTrap, true);
    } else if (!forceFocusInsideTrap && disposeFocusHandler) {
      disposeFocusHandler();
      disposeFocusHandler = undefined;
    }

    if (!isClickableOutsideFocusTrap && !disposeClickHandler) {
      disposeClickHandler = on(window, 'click', forceClickInTrap, true);
    } else if (isClickableOutsideFocusTrap && disposeClickHandler) {
      disposeClickHandler();
      disposeClickHandler = undefined;
    }
  };

  const onFocusCapture = (ev: React.FocusEvent<HTMLDivElement>) => {
    if (props.onFocusCapture) {
      props.onFocusCapture(ev);
    }

    if (ev.target !== ev.currentTarget && !isBumper(ev.target)) {
      // every time focus changes within the trap zone, remember the focused element so that
      // it can be restored if focus leaves the pane and returns via keystroke (i.e. via a call to this.focus(true))
      previouslyFocusedElementInTrapZone = ev.target as HTMLElement;
    }
  };

  const isBumper = (element: HTMLElement): boolean => {
    return element === firstBumper.current || element === lastBumper.current;
  };

  const forceFocusInTrap = (ev: FocusEvent): void => {
    if (props.disabled) {
      return;
    }

    if (focusStack.length && this === focusStack[focusStack.length - 1]) {
      const focusedElement = useGetDocument().activeElement as HTMLElement;

      if (!elementContains(root.current, focusedElement)) {
        focus();
        hasFocus = true; // set focus here since we stop event propagation
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  const forceClickInTrap = (ev: MouseEvent): void => {
    if (props.disabled) {
      return;
    }

    if (focusStack.length && this === focusStack[focusStack.length - 1]) {
      const clickedElement = ev.target as HTMLElement;

      if (clickedElement && !elementContains(root.current, clickedElement)) {
        focus();
        hasFocus = true; // set focus here since we stop event propagation
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  const useGetDocument = (): Document => {
    return getDocument(root.current)!;
  };

  returnFocusToInitiator();
  bringFocusIntoZone();
  updateEventHandlers(props);
  const { elementToFocusOnDismiss } = props;

  // don't handle return focus unless forceFocusInsideTrap is true or focus is still within FocusTrapZone
  if (doc) {
    if (
      !props.disabled ||
      props.forceFocusInsideTrap ||
      !elementContains(root.current, doc.activeElement as HTMLElement)
    ) {
      returnFocusToInitiator();
    }
  }
  // Dispose of event handlers so their closures can be garbage-collected
  if (disposeClickHandler) {
    disposeClickHandler();
    disposeClickHandler = undefined;
  }

  if (disposeFocusHandler) {
    disposeFocusHandler();
    disposeFocusHandler = undefined;
  }

  // Dispose of element references so the DOM Nodes can be garbage-collected
  // delete previouslyFocusedElementInTrapZone;
  // delete previouslyFocusedElementOutsideTrapZone;

  if (elementToFocusOnDismiss && previouslyFocusedElementOutsideTrapZone !== elementToFocusOnDismiss) {
    previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss;
  }
  updateEventHandlers(props);

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

  useComponentRef(props, previouslyFocusedElementInTrapZone, root, firstBumper, lastBumper);

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
