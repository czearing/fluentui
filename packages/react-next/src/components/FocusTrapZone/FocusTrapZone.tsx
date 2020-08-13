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
  initializeComponentRef,
  on,
} from '../../Utilities';
import { useControllableValue, useMergedRefs } from '@uifabric/react-hooks';
import { IFocusTrapZone, IFocusTrapZoneProps } from './FocusTrapZone.types';

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

export const FocusTrapZone = React.forwardRef((props: IFocusTrapZoneProps, forwardRef: React.Ref<HTMLDivElement>) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const mergedRootRef = useMergedRefs(rootRef, forwardRef);
  const firstBumper = React.useRef<HTMLDivElement>(null);
  const lastBumper = React.useRef<HTMLDivElement>(null);
  const { className, disabled = false, ariaLabelledBy } = props;
  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties);

  const bumperProps = {
    'aria-hidden': true,
    style: {
      pointerEvents: 'none',
      position: 'fixed', // 'fixed' prevents browsers from scrolling to bumpers when viewport does not contain them
    },
    tabIndex: disabled ? -1 : 0, // make bumpers tabbable only when enabled
    'data-is-visible': true,
  } as React.HTMLAttributes<HTMLDivElement>;

  const focusAsync = (element: HTMLElement): void => {
    if (!isBumper(element)) {
      focusAsync(element);
    }
  };

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
      relatedTarget = getDocument().activeElement as Element;
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

    if (rootRef.current) {
      const nextFocusable =
        isFirstBumper === hasFocus
          ? getLastTabbable(rootRef.current, currentBumper, true, false)
          : getFirstTabbable(rootRef.current, currentBumper, true, false);

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
    const { elementToFocusOnDismiss, disableFirstFocus = false } = props;

    if (disabled) {
      return;
    }

    FocusTrapZone.focusStack.push(rootRef);

    previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss
      ? elementToFocusOnDismiss
      : (getDocument().activeElement as HTMLElement);
    if (!disableFirstFocus && !elementContains(rootRef.current, previouslyFocusedElementOutsideTrapZone)) {
      focus();
    }
  };

  const returnFocusToInitiator = (): void => {
    const { ignoreExternalFocusing } = props;

    FocusTrapZone._focusStack = FocusTrapZone._focusStack.filter((value: FocusTrapZone) => {
      return this !== value;
    });

    const doc = getCurrentDocument();
    const activeElement = doc.activeElement as HTMLElement;
    if (
      !ignoreExternalFocusing &&
      previouslyFocusedElementOutsideTrapZone &&
      typeof previouslyFocusedElementOutsideTrapZone.focus === 'function' &&
      (elementContains(rootRef.current, activeElement) || activeElement === doc.body)
    ) {
      focusAsync(previouslyFocusedElementOutsideTrapZone);
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

    if (FocusTrapZone._focusStack.length && this === FocusTrapZone._focusStack[FocusTrapZone._focusStack.length - 1]) {
      const focusedElement = getCurrentDocument().activeElement as HTMLElement;

      if (!elementContains(rootRef.current, focusedElement)) {
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

    if (FocusTrapZone._focusStack.length && this === FocusTrapZone._focusStack[FocusTrapZone._focusStack.length - 1]) {
      const clickedElement = ev.target as HTMLElement;

      if (clickedElement && !elementContains(rootRef.current, clickedElement)) {
        focus();
        hasFocus = true; // set focus here since we stop event propagation
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };

  const getCurrentDocument = (): Document => {
    return getDocument(rootRef.current)!;
  };

  const focus = () => {
    const { focusPreviouslyFocusedInnerElement, firstFocusableSelector } = props;

    if (
      focusPreviouslyFocusedInnerElement &&
      previouslyFocusedElementInTrapZone &&
      elementContains(rootRef.current, previouslyFocusedElementInTrapZone)
    ) {
      // focus on the last item that had focus in the zone before we left the zone
      focusAsync(previouslyFocusedElementInTrapZone);
      return;
    }

    const focusSelector =
      typeof firstFocusableSelector === 'string'
        ? firstFocusableSelector
        : firstFocusableSelector && firstFocusableSelector();

    let _firstFocusableChild: HTMLElement | null = null;

    if (rootRef.current) {
      if (focusSelector) {
        _firstFocusableChild = rootRef.current.querySelector('.' + focusSelector);
      }

      // Fall back to first element if query selector did not match any elements.
      if (!_firstFocusableChild) {
        _firstFocusableChild = getNextElement(
          root.current,
          root.current.firstChild as HTMLElement,
          false,
          false,
          false,
          true,
        );
      }
    }
    if (_firstFocusableChild) {
      focusAsync(_firstFocusableChild);
    }
  };

  // Component did mount
  React.useEffect(() => {
    bringFocusIntoZone();
    updateEventHandlers(props);
  }, []);

  return (
    <div
      {...divProps}
      className={className}
      ref={mergedRootRef}
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
});

export class FocusTrapZone extends React.Component<IFocusTrapZoneProps, {}> implements IFocusTrapZone {
  private static _focusStack: FocusTrapZone[] = [];

  private _root = React.createRef<HTMLDivElement>();
  private _firstBumper = React.createRef<HTMLDivElement>();
  private _lastBumper = React.createRef<HTMLDivElement>();
  private _hasFocus: boolean = false;

  private _previouslyFocusedElementOutsideTrapZone: HTMLElement;
  private _previouslyFocusedElementInTrapZone?: HTMLElement;
  private _disposeFocusHandler: (() => void) | undefined;
  private _disposeClickHandler: (() => void) | undefined;

  public constructor(props: IFocusTrapZoneProps) {
    super(props);
    initializeComponentRef(this);
  }

  public componentDidMount(): void {
    this._bringFocusIntoZone();
    this._updateEventHandlers(this.props);
  }

  public UNSAFE_componentWillReceiveProps(nextProps: IFocusTrapZoneProps): void {
    const { elementToFocusOnDismiss } = nextProps;
    if (elementToFocusOnDismiss && this._previouslyFocusedElementOutsideTrapZone !== elementToFocusOnDismiss) {
      this._previouslyFocusedElementOutsideTrapZone = elementToFocusOnDismiss;
    }

    this._updateEventHandlers(nextProps);
  }

  public componentDidUpdate(prevProps: IFocusTrapZoneProps) {
    const prevForceFocusInsideTrap =
      prevProps.forceFocusInsideTrap !== undefined ? prevProps.forceFocusInsideTrap : true;
    const newForceFocusInsideTrap =
      this.props.forceFocusInsideTrap !== undefined ? this.props.forceFocusInsideTrap : true;
    const prevDisabled = prevProps.disabled !== undefined ? prevProps.disabled : false;
    const newDisabled = this.props.disabled !== undefined ? this.props.disabled : false;

    if ((!prevForceFocusInsideTrap && newForceFocusInsideTrap) || (prevDisabled && !newDisabled)) {
      // Transition from forceFocusInsideTrap / FTZ disabled to enabled.
      // Emulate what happens when a FocusTrapZone gets mounted.
      this._bringFocusIntoZone();
    } else if ((prevForceFocusInsideTrap && !newForceFocusInsideTrap) || (!prevDisabled && newDisabled)) {
      // Transition from forceFocusInsideTrap / FTZ enabled to disabled.
      // Emulate what happens when a FocusTrapZone gets unmounted.
      this._returnFocusToInitiator();
    }
  }

  public componentWillUnmount(): void {
    // don't handle return focus unless forceFocusInsideTrap is true or focus is still within FocusTrapZone
    if (
      !this.props.disabled ||
      this.props.forceFocusInsideTrap ||
      !elementContains(this._root.current, this._getDocument().activeElement as HTMLElement)
    ) {
      this._returnFocusToInitiator();
    }

    // Dispose of event handlers so their closures can be garbage-collected
    if (this._disposeClickHandler) {
      this._disposeClickHandler();
      this._disposeClickHandler = undefined;
    }

    if (this._disposeFocusHandler) {
      this._disposeFocusHandler();
      this._disposeFocusHandler = undefined;
    }

    // Dispose of element references so the DOM Nodes can be garbage-collected
    delete this._previouslyFocusedElementInTrapZone;
    delete this._previouslyFocusedElementOutsideTrapZone;
  }

  public render(): JSX.Element {
    const { className, disabled = false, ariaLabelledBy } = this.props;
    const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(this.props, divProperties);

    const bumperProps = {
      'aria-hidden': true,
      style: {
        pointerEvents: 'none',
        position: 'fixed', // 'fixed' prevents browsers from scrolling to bumpers when viewport does not contain them
      },
      tabIndex: disabled ? -1 : 0, // make bumpers tabbable only when enabled
      'data-is-visible': true,
    } as React.HTMLAttributes<HTMLDivElement>;

    return (
      <div
        {...divProps}
        className={className}
        ref={this._root}
        aria-labelledby={ariaLabelledBy}
        onFocusCapture={this._onFocusCapture}
        onFocus={this._onRootFocus}
        onBlur={this._onRootBlur}
      >
        <div {...bumperProps} ref={this._firstBumper} onFocus={this._onFirstBumperFocus} />
        {this.props.children}
        <div {...bumperProps} ref={this._lastBumper} onFocus={this._onLastBumperFocus} />
      </div>
    );
  }

  public focus() {
    const { focusPreviouslyFocusedInnerElement, firstFocusableSelector } = this.props;

    if (
      focusPreviouslyFocusedInnerElement &&
      this._previouslyFocusedElementInTrapZone &&
      elementContains(this._root.current, this._previouslyFocusedElementInTrapZone)
    ) {
      // focus on the last item that had focus in the zone before we left the zone
      this._focusAsync(this._previouslyFocusedElementInTrapZone);
      return;
    }

    const focusSelector =
      typeof firstFocusableSelector === 'string'
        ? firstFocusableSelector
        : firstFocusableSelector && firstFocusableSelector();

    let _firstFocusableChild: HTMLElement | null = null;

    if (this._root.current) {
      if (focusSelector) {
        _firstFocusableChild = this._root.current.querySelector('.' + focusSelector);
      }

      // Fall back to first element if query selector did not match any elements.
      if (!_firstFocusableChild) {
        _firstFocusableChild = getNextElement(
          this._root.current,
          this._root.current.firstChild as HTMLElement,
          false,
          false,
          false,
          true,
        );
      }
    }
    if (_firstFocusableChild) {
      this._focusAsync(_firstFocusableChild);
    }
  }
}
