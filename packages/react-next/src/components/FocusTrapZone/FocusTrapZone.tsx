import * as React from 'react';
import {
  elementContains,
  getNativeProps,
  divProperties,
  getFirstTabbable,
  getLastTabbable,
  getNextElement,
  focusAsync,
  IRefObject,
  on,
} from '../../Utilities';
import { IFocusTrapZoneProps, IFocusTrapZone } from './FocusTrapZone.types';
import { useId, useConst, useMergedRefs } from '@uifabric/react-hooks';
import { useDocument } from '@fluentui/react-window-provider';

interface IFocusTrapZoneState {
  disposeFocusHandler: (() => void) | undefined;
  disposeClickHandler: (() => void) | undefined;
  previouslyFocusedElementOutsideTrapZone: HTMLElement | undefined;
  previouslyFocusedElementInTrapZone: HTMLElement | undefined;
  hasFocus: boolean;
  hasPreviouslyRendered: boolean;
}

const COMPONENT_NAME = 'FocusTrapZone';

const useComponentRef = (
  componentRef: IRefObject<IFocusTrapZone> | undefined,
  previouslyFocusedElement: HTMLElement | undefined,
  focus: () => void,
) => {
  React.useImperativeHandle(
    componentRef,
    () => ({
      get previouslyFocusedElement() {
        return previouslyFocusedElement;
      },
      focus() {
        focus();
      },
    }),
    [previouslyFocusedElement, focus],
  );
};

export const FocusTrapZone: React.ForwardRefExoticComponent<IFocusTrapZoneProps> & {
  focusStack: string[];
} = React.forwardRef<HTMLElement, IFocusTrapZoneProps>((props, ref) => {
  const root = React.useRef<HTMLDivElement>(null);
  const firstBumper = React.useRef<HTMLDivElement>(null);
  const lastBumper = React.useRef<HTMLDivElement>(null);
  const mergedRootRef = useMergedRefs(root, ref) as React.Ref<HTMLDivElement>;
  const id = useId(undefined, props.id);
  const doc = useDocument();
  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);

  const {
    ariaLabelledBy,
    className,
    children,
    componentRef,
    disabled,
    disableFirstFocus = false,
    disabled: currentDisabledValue = false,
    elementToFocusOnDismiss,
    forceFocusInsideTrap = true,
    focusPreviouslyFocusedInnerElement,
    firstFocusableSelector,
    ignoreExternalFocusing,
    isClickableOutsideFocusTrap = false,
    onFocus,
    onBlur,
    onFocusCapture,
  } = props;

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
      focusAsync(internalState.previouslyFocusedElementInTrapZone);
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
      focusAsync(firstFocusableChild);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
  }, [firstFocusableSelector, focusPreviouslyFocusedInnerElement]);

  const isBumper = React.useCallback(
    (element: HTMLElement): boolean => {
      return element === firstBumper.current || element === lastBumper.current;
    },
    [firstBumper, lastBumper],
  );

  const setElementFocus = React.useCallback(
    (element: HTMLElement): void => {
      if (!isBumper(element)) {
        focusAsync(element);
      }
    },
    [isBumper],
  );

  const onBumperFocus = React.useCallback(
    (isFirstBumper: boolean) => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [disabled, focus, isBumper],
  );

  const onRootFocus = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      onFocus?.(ev);
      internalState.hasFocus = true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [onFocus],
  );

  const onRootBlur = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(ev);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [onBlur, doc],
  );

  const onRootFocusCapture = React.useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      onFocusCapture?.(ev);

      if (ev.target !== ev.currentTarget && !isBumper(ev.target)) {
        // every time focus changes within the trap zone, remember the focused element so that
        // it can be restored if focus leaves the pane and returns via keystroke (i.e. via a call to this.focus(true))
        internalState.previouslyFocusedElementInTrapZone = ev.target as HTMLElement;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [isBumper, onFocusCapture],
  );

  const bringFocusIntoZone = React.useCallback((): void => {
    if (currentDisabledValue) {
      return;
    }

    FocusTrapZone.focusStack.push(id);

    internalState.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss
      ? elementToFocusOnDismiss
      : (doc!.activeElement as HTMLElement);
    if (!disableFirstFocus && !elementContains(root.current, internalState.previouslyFocusedElementOutsideTrapZone)) {
      focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
  }, [currentDisabledValue, id, elementToFocusOnDismiss, doc, disableFirstFocus, focus]);

  const returnFocusToInitiator = React.useCallback((): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FocusTrapZone.focusStack = FocusTrapZone.focusStack.filter((value: any) => {
      return id !== value;
    });

    if (doc) {
      const activeElement = doc.activeElement as HTMLElement;
      if (
        !ignoreExternalFocusing &&
        internalState.previouslyFocusedElementOutsideTrapZone &&
        typeof internalState.previouslyFocusedElementOutsideTrapZone.focus === 'function' &&
        (elementContains(root.current, activeElement) || activeElement === doc.body)
      ) {
        setElementFocus(internalState.previouslyFocusedElementOutsideTrapZone);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
  }, [doc, id, ignoreExternalFocusing, setElementFocus]);

  const forceFocusInTrap = React.useCallback(
    (ev: FocusEvent): void => {
      if (disabled) {
        return;
      }
      if (FocusTrapZone.focusStack.length && id === FocusTrapZone.focusStack[FocusTrapZone.focusStack.length - 1]) {
        const focusedElement = ev.target as HTMLElement;
        if (!elementContains(root.current, focusedElement)) {
          focus();
          internalState.hasFocus = true; // set focus here since we stop event propagation
          ev.preventDefault();
          ev.stopPropagation();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [disabled, id, focus],
  );

  const forceClickInTrap = React.useCallback(
    (ev: MouseEvent): void => {
      if (disabled) {
        return;
      }
      if (FocusTrapZone.focusStack.length && id === FocusTrapZone.focusStack[FocusTrapZone.focusStack.length - 1]) {
        const clickedElement = ev.target as HTMLElement;
        if (clickedElement && !elementContains(root.current, clickedElement)) {
          focus();
          internalState.hasFocus = true; // set focus here since we stop event propagation
          ev.preventDefault();
          ev.stopPropagation();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
    [disabled, id, focus],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internal state will not change
  }, [forceClickInTrap, forceFocusInTrap, forceFocusInsideTrap, isClickableOutsideFocusTrap]);

  React.useEffect(() => {
    const parentRoot = root.current;
    updateEventHandlers();
    return () => {
      // don't handle return focus unless forceFocusInsideTrap is true or focus is still within FocusTrapZone
      if (!disabled || forceFocusInsideTrap || !elementContains(parentRoot, doc?.activeElement as HTMLElement)) {
        returnFocusToInitiator();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Should only run on mount.
  }, []);

  useUnmount(() => {
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
    internalState.previouslyFocusedElementInTrapZone = undefined;
    internalState.previouslyFocusedElementOutsideTrapZone = undefined;
  });

  React.useEffect(() => {
    const newForceFocusInsideTrap = forceFocusInsideTrap !== undefined ? forceFocusInsideTrap : true;
    const newDisabled = disabled !== undefined ? disabled : false;

    if (!newDisabled || newForceFocusInsideTrap) {
      // Transition from forceFocusInsideTrap / FTZ disabled to enabled.
      bringFocusIntoZone();
    } else if (!newForceFocusInsideTrap || newDisabled) {
      // Transition from forceFocusInsideTrap / FTZ enabled to disabled.
      returnFocusToInitiator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceFocusInsideTrap, disabled]);

  React.useEffect(() => {
    if (elementToFocusOnDismiss && internalState.previouslyFocusedElementOutsideTrapZone !== elementToFocusOnDismiss) {
      internalState.previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss;
    }
    updateEventHandlers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- internalState shouldn't change.
  }, [elementToFocusOnDismiss, updateEventHandlers]);

  useComponentRef(componentRef, internalState.previouslyFocusedElementInTrapZone, focus);

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
      <div {...bumperProps} ref={firstBumper} onFocus={() => onBumperFocus(true)} />
      {children}
      <div {...bumperProps} ref={lastBumper} onFocus={() => onBumperFocus(false)} />
    </div>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

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

FocusTrapZone.displayName = COMPONENT_NAME;
FocusTrapZone.focusStack = [];
