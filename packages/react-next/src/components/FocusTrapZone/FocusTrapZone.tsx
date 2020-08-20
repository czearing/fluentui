import * as React from 'react';
import {
  elementContains,
  getNativeProps,
  divProperties,
  getFirstTabbable,
  getLastTabbable,
  getNextElement,
  focusAsync,
  on,
} from '../../Utilities';
import { IFocusTrapZoneProps } from './FocusTrapZone.types';
import { useId, useConst, usePrevious, useConstCallback, useMergedRefs } from '@uifabric/react-hooks';
import { useDocument } from '@fluentui/react-window-provider';

const useUnmount = (unmountFunction: () => void) => {
  const unmountRef = React.useRef(unmountFunction);
  unmountRef.current = unmountFunction;
  React.useEffect(
    () => () => {
      if (unmountRef.current) {
        unmountRef.current();
      }
    },
    [unmountFunction],
  );
};

const useComponentRef = (
  props: IFocusTrapZoneProps,
  previouslyFocusedElementInTrapZone: HTMLElement | undefined,
  focus: () => void,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get previouslyFocusedElementInTrapZone() {
        return previouslyFocusedElementInTrapZone;
      },
      focus,
    }),
    [previouslyFocusedElementInTrapZone, focus],
  );
};

interface IFocusTrapZoneState {
  disposeFocusHandler: (() => void) | undefined;
  disposeClickHandler: (() => void) | undefined;
  previouslyFocusedElementOutsideTrapZone: HTMLElement | undefined;
  previouslyFocusedElementInTrapZone: HTMLElement | undefined;
  hasFocus: boolean;
  hasPreviouslyRendered: boolean;
}

const COMPONENT_NAME = 'FocusTrapZone';
let focusStack: string[] = [];

export const FocusTrapZone = React.forwardRef<HTMLElement, IFocusTrapZoneProps>((props, ref) => {
  const root = React.useRef<HTMLDivElement>(null);
  const firstBumper = React.useRef<HTMLDivElement>(null);
  const lastBumper = React.useRef<HTMLDivElement>(null);
  const mergedRootRef = useMergedRefs(root, ref) as React.Ref<HTMLDivElement>;
  const id = useId();
  const doc = useDocument();
  const {
    ariaLabelledBy,
    className,
    children,
    elementToFocusOnDismiss,
    focusPreviouslyFocusedInnerElement,
    firstFocusableSelector,
    disabled,
    onFocus,
    onBlur,
    onFocusCapture,
    disableFirstFocus = false,
    disabled: currentDisabledValue = false,
    ignoreExternalFocusing,
    isClickableOutsideFocusTrap = false,
    forceFocusInsideTrap = true,
  } = props;
  const previousProps = usePrevious(props);
  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);

  const internalState = useConst<IFocusTrapZoneState>(() => ({
    previouslyFocusedElementOutsideTrapZone: undefined,
    previouslyFocusedElementInTrapZone: undefined,
    disposeFocusHandler: undefined,
    disposeClickHandler: undefined,
    hasFocus: false,
    hasPreviouslyRendered: false,
  }));

  const bumperProps = {
    style: {
      pointerEvents: 'none',
      position: 'fixed', // 'fixed' prevents browsers from scrolling to bumpers when viewport does not contain them
    },
    tabIndex: disabled ? -1 : 0, // make bumpers tabbable only when enabled
    'data-is-visible': true,
  } as React.HTMLAttributes<HTMLDivElement>;

  const focus = React.useCallback(() => {
    if (
      focusPreviouslyFocusedInnerElement &&
      internalState.previouslyFocusedElementInTrapZone &&
      elementContains(root.current, internalState.previouslyFocusedElementInTrapZone)
    ) {
      // focus on the last item that had focus in the zone before we left the zone
      if (
        !(
          internalState.previouslyFocusedElementInTrapZone === firstBumper.current ||
          internalState.previouslyFocusedElementInTrapZone === lastBumper.current
        )
      ) {
        focusAsync(internalState.previouslyFocusedElementInTrapZone);
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
      if (!(firstFocusableChild === firstBumper.current || firstFocusableChild === lastBumper.current)) {
        focusAsync(firstFocusableChild);
      }
    }
  }, [firstFocusableSelector, focusPreviouslyFocusedInnerElement, internalState.previouslyFocusedElementInTrapZone]);

  const onRootFocus = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      if (onFocus) {
        onFocus(ev);
      }
      internalState.hasFocus = true;
    },
    [onFocus, internalState.hasFocus],
  );

  const onRootBlur = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      if (onBlur) {
        onBlur(ev);
      }
      let relatedTarget = ev.relatedTarget;
      if (ev.relatedTarget === null) {
        // In IE11, due to lack of support, event.relatedTarget is always
        // null making every onBlur call to be "outside" of the ComboBox
        // even when it's not. Using document.activeElement is another way
        // for us to be able to get what the relatedTarget without relying
        // on the event
        relatedTarget = doc!.activeElement as Element;
      }
      if (!elementContains(root.current, relatedTarget as HTMLElement)) {
        internalState.hasFocus = false;
      }
    },
    [onBlur, internalState.hasFocus, doc],
  );

  const onFirstBumperFocus = useConstCallback(() => {
    onBumperFocus(true);
  });

  const onLastBumperFocus = useConstCallback(() => {
    onBumperFocus(false);
  });

  const onBumperFocus = (isFirstBumper: boolean) => {
    if (disabled) {
      return;
    }

    const currentBumper = (isFirstBumper === internalState.hasFocus
      ? lastBumper.current
      : firstBumper.current) as HTMLElement;

    if (root.current) {
      const nextFocusable =
        isFirstBumper === internalState.hasFocus
          ? getLastTabbable(root.current, currentBumper, true, false)
          : getFirstTabbable(root.current, currentBumper, true, false);

      if (nextFocusable) {
        if (isBumper(nextFocusable)) {
          // This can happen when FTZ contains no tabbable elements.
          // focus will take care of finding a focusable element in FTZ.
          focus();
        } else {
          nextFocusable.focus();
        }
      }
    }
  };

  const bringFocusIntoZone = React.useCallback((): void => {
    if (currentDisabledValue) {
      return;
    }

    internalState.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss
      ? elementToFocusOnDismiss
      : (doc!.activeElement as HTMLElement);
    if (!disableFirstFocus && !elementContains(root.current, internalState.previouslyFocusedElementOutsideTrapZone)) {
      focus();
    }
  }, [
    doc,
    elementToFocusOnDismiss,
    focus,
    currentDisabledValue,
    disableFirstFocus,
    internalState.previouslyFocusedElementOutsideTrapZone,
  ]);

  const isBumper = useConstCallback((element: HTMLElement): boolean => {
    return element === firstBumper.current || element === lastBumper.current;
  });

  const setAsyncFocus = React.useCallback(
    (element: HTMLElement): void => {
      if (!isBumper(element)) {
        focusAsync(element);
      }
    },
    [isBumper],
  );

  const onRootFocusCapture = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      if (onFocusCapture) {
        onFocusCapture(ev);
      }
      if (ev.target !== ev.currentTarget && !isBumper(ev.target)) {
        // every time focus changes within the trap zone, remember the focused element so that
        // it can be restored if focus leaves the pane and returns via keystroke (i.e. via a call to this.focus(true))
        internalState.previouslyFocusedElementInTrapZone = ev.target as HTMLElement;
      }
    },

    [internalState.previouslyFocusedElementInTrapZone, isBumper, onFocusCapture],
  );

  const returnFocusToInitiator = React.useCallback((): void => {
    if (doc) {
      const activeElement = doc.activeElement as HTMLElement;
      if (
        !ignoreExternalFocusing &&
        internalState.previouslyFocusedElementOutsideTrapZone &&
        typeof internalState.previouslyFocusedElementOutsideTrapZone.focus === 'function' &&
        (elementContains(root.current, activeElement) || activeElement === doc.body)
      ) {
        setAsyncFocus(internalState.previouslyFocusedElementOutsideTrapZone);
      }
    }
  }, [doc, ignoreExternalFocusing, setAsyncFocus, internalState.previouslyFocusedElementOutsideTrapZone]);

  const forceFocusInTrap = React.useCallback(
    (ev: FocusEvent): void => {
      if (disabled) {
        return;
      }
      if (focusStack.length && id === focusStack[focusStack.length - 1]) {
        const focusedElement = ev.target as HTMLElement;
        if (!elementContains(root.current, focusedElement)) {
          focus();
          internalState.hasFocus = true; // set focus here since we stop event propagation
          ev.preventDefault();
          ev.stopPropagation();
        }
      }
    },
    [focus, id, disabled],
  );

  const forceClickInTrap = React.useCallback(
    (ev: MouseEvent): void => {
      if (disabled) {
        return;
      }
      if (focusStack.length && id === focusStack[focusStack.length - 1]) {
        const clickedElement = ev.target as HTMLElement;
        if (clickedElement && !elementContains(root.current, clickedElement)) {
          focus();
          internalState.hasFocus = true; // set focus here since we stop event propagation
          ev.preventDefault();
          ev.stopPropagation();
        }
      }
    },
    [focus, id, disabled, internalState.hasFocus],
  );

  const updateEventHandlers = React.useCallback((): void => {
    if (forceFocusInsideTrap && !internalState.disposeFocusHandler) {
      internalState.disposeFocusHandler = on(window, 'focus', forceFocusInTrap, true);
    } else if (!forceFocusInsideTrap && internalState.disposeFocusHandler) {
      internalState.disposeFocusHandler();
      internalState.disposeFocusHandler = undefined;
    }

    if (!isClickableOutsideFocusTrap && !internalState.disposeClickHandler) {
      internalState.disposeClickHandler = on(window, 'click', forceClickInTrap, true);
    } else if (isClickableOutsideFocusTrap && internalState.disposeClickHandler) {
      internalState.disposeClickHandler();
      internalState.disposeClickHandler = undefined;
    }
  }, [
    forceClickInTrap,
    forceFocusInTrap,
    forceFocusInsideTrap,
    isClickableOutsideFocusTrap,
    internalState.disposeFocusHandler,
    internalState.disposeClickHandler,
  ]);

  React.useEffect(() => {
    if (elementToFocusOnDismiss && internalState.previouslyFocusedElementOutsideTrapZone !== elementToFocusOnDismiss) {
      internalState.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss;
    }
    updateEventHandlers();
  }, [internalState.previouslyFocusedElementOutsideTrapZone, updateEventHandlers, elementToFocusOnDismiss]);

  React.useEffect(() => {
    const prevForceFocusInsideTrap =
      previousProps?.forceFocusInsideTrap !== undefined ? previousProps.forceFocusInsideTrap : true;
    const newForceFocusInsideTrap = forceFocusInsideTrap !== undefined ? forceFocusInsideTrap : true;
    const prevDisabled = previousProps?.disabled !== undefined ? previousProps?.disabled : false;
    const newDisabled = disabled !== undefined ? disabled : false;

    if ((!prevForceFocusInsideTrap && newForceFocusInsideTrap) || (prevDisabled && !newDisabled)) {
      // Transition from forceFocusInsideTrap / FTZ disabled to enabled.
      // Emulate what happens when a FocusTrapZone gets mounted.
      internalState.hasPreviouslyRendered = true;
      bringFocusIntoZone();
    } else if ((prevForceFocusInsideTrap && !newForceFocusInsideTrap) || (!prevDisabled && newDisabled)) {
      // Transition from forceFocusInsideTrap / FTZ enabled to disabled.
      // Emulate what happens when a FocusTrapZone gets unmounted.
      returnFocusToInitiator();
    }
    updateEventHandlers();
  }, [bringFocusIntoZone, disabled, forceFocusInsideTrap, returnFocusToInitiator, updateEventHandlers]);

  useUnmount(() => {
    if (doc) {
      // don't handle return focus unless forceFocusInsideTrap is true or focus is still within FocusTrapZone
      if (!disabled || forceFocusInsideTrap || !elementContains(root.current, doc.activeElement as HTMLElement)) {
        returnFocusToInitiator();
      }
    }
    // Dispose of event handlers so their closures can be garbage-collected
    if (internalState.disposeClickHandler) {
      internalState.disposeClickHandler();
      internalState.disposeClickHandler = undefined;
    }
    if (internalState.disposeFocusHandler) {
      internalState.disposeFocusHandler();
      internalState.disposeFocusHandler = undefined;
    }
    // Dispose of element references so the DOM Nodes can be garbage-collected
    delete internalState.previouslyFocusedElementInTrapZone;
    delete internalState.previouslyFocusedElementOutsideTrapZone;
  });

  // Previously was componentDidMount.
  React.useEffect(() => {
    focusStack.push(id);

    bringFocusIntoZone();
    updateEventHandlers();

    return () => {
      focusStack = focusStack.filter((value: string) => {
        return id !== value;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useComponentRef(props, internalState.previouslyFocusedElementInTrapZone, focus);

  return (
    <div
      {...divProps}
      className={className}
      ref={mergedRootRef}
      aria-labelledby={ariaLabelledBy}
      onFocusCapture={onRootFocusCapture}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
    >
      <div {...bumperProps} ref={firstBumper} onFocus={onFirstBumperFocus} />
      {children}
      <div {...bumperProps} ref={lastBumper} onFocus={onLastBumperFocus} />
    </div>
  );
});
FocusTrapZone.displayName = COMPONENT_NAME;
