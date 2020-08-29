import * as React from 'react';
import { FocusZoneDirection, FocusZoneTabbableElements, IFocusZone, IFocusZoneProps } from './FocusZone.types';
import {
  KeyCodes,
  css,
  elementContains,
  getDocument,
  getElementIndexPath,
  getFocusableByIndexPath,
  getId,
  getNativeProps,
  getNextElement,
  getParent,
  getPreviousElement,
  getRTL,
  htmlElementProperties,
  initializeComponentRef,
  isElementFocusSubZone,
  isElementFocusZone,
  isElementTabbable,
  raiseClick,
  shouldWrapFocus,
  warnDeprecations,
  portalContainsElement,
  Point,
  getWindow,
  findScrollableParent,
} from '@uifabric/utilities';
import { mergeStyles } from '@uifabric/merge-styles';
import { useMergedRefs, useConst } from '@uifabric/react-hooks';

const IS_FOCUSABLE_ATTRIBUTE = 'data-is-focusable';
const IS_ENTER_DISABLED_ATTRIBUTE = 'data-disable-click-on-enter';
const FOCUSZONE_ID_ATTRIBUTE = 'data-focuszone-id';
const TABINDEX = 'tabindex';
const NO_VERTICAL_WRAP = 'data-no-vertical-wrap';
const NO_HORIZONTAL_WRAP = 'data-no-horizontal-wrap';
const LARGE_DISTANCE_FROM_CENTER = 999999999;
const LARGE_NEGATIVE_DISTANCE_FROM_CENTER = -999999999;

let focusZoneStyles: string;
const focusZoneClass: string = 'ms-FocusZone';

interface IFocusZoneState {
  activeElement: HTMLElement | null;
  lastIndexPath: number[] | undefined;
  isParked: boolean;
  focusAlignment: Point;
  defaultFocusElement: HTMLElement | null;
  isInnerZone: boolean;
  parkedTabIndex: string | null | undefined;
  processingTabKey: boolean;
}
// Helper function that will return a class for when the root is focused
function getRootClass(): string {
  if (!focusZoneStyles) {
    focusZoneStyles = mergeStyles(
      {
        selectors: {
          ':focus': {
            outline: 'none',
          },
        },
      },
      focusZoneClass,
    );
  }
  return focusZoneStyles;
}

const allInstances: {
  [key: string]: IFocusZone;
} = {};
// const _outerZones: Set<FocusZone> = new Set();

const ALLOWED_INPUT_TYPES = ['text', 'number', 'password', 'email', 'tel', 'url', 'search'];

const ALLOW_VIRTUAL_ELEMENTS = false;

export const FocusZone = React.forwardRef<HTMLElement, IFocusZoneProps>((props, ref) => {
  const root: React.RefObject<HTMLElement> = React.useRef(null);
  const id: string = getId('FocusZone');

  const mergedRef = useMergedRefs(root, ref);

  const internalState = useConst<IFocusZoneState>(() => ({
    /** The most recently focused child element. */
    activeElement: null,
    /**
     * The index path to the last focused child element.
     */
    lastIndexPath: undefined,
    /**
     * Flag to define when we've intentionally parked focus on the root element to temporarily
     * hold focus until items appear within the zone.
     */
    isParked: false,
    focusAlignment: {
      left: 0,
      top: 0,
    },
    /** The child element with tabindex=0. */
    defaultFocusElement: null,
    isInnerZone: false,
    parkedTabIndex: undefined,
    /** Used to allow moving to next focusable element even when we're focusing on a input element when pressing tab */
    processingTabKey: false,
  }));

  const {
    as: tag,
    allowFocusRoot,
    // eslint-disable-next-line deprecation/deprecation
    elementType,
    disabled,
    // eslint-disable-next-line deprecation/deprecation
    rootProps,
    // eslint-disable-next-line deprecation/deprecation
    ariaDescribedBy,
    // eslint-disable-next-line deprecation/deprecation
    ariaLabelledBy,
    // eslint-disable-next-line deprecation/deprecation
    isInnerZoneKeystroke,
    pagingSupportDisabled,
    shouldEnterInnerZone,
    className,
    shouldResetActiveElementWhenTabFromZone,
    children,
    isCircularNavigation = false,
    direction = FocusZoneDirection.bidirectional,
    shouldRaiseClicks = true,
    onActiveElementChanged,
    // eslint-disable-next-line deprecation/deprecation
    doNotAllowFocusEventToPropagate,
    stopFocusPropagation,
    // eslint-disable-next-line deprecation/deprecation
    onFocusNotification,
    shouldFocusInnerElementWhenReceivedFocus,
    defaultTabbableElement,
    // eslint-disable-next-line deprecation/deprecation
    allowTabKey,
    handleTabKey,
    // eslint-disable-next-line deprecation/deprecation
    onBeforeFocus,
    shouldReceiveFocus,
  } = props;

  const divProps = getNativeProps(props, htmlElementProperties);

  const Tag = tag || elementType || 'div';

  /**
   * Sets focus to the first tabbable item in the zone.
   * @param forceIntoFirstElement - If true, focus will be forced into the first element, even
   * if focus is already in the focus zone.
   * @returns True if focus could be set to an active element, false if no operation was taken.
   */
  const focus = (forceIntoFirstElement: boolean = false): boolean => {
    if (root.current) {
      if (
        !forceIntoFirstElement &&
        root.current.getAttribute(IS_FOCUSABLE_ATTRIBUTE) === 'true' &&
        internalState.isInnerZone
      ) {
        const ownerZoneElement = getOwnerZone(root.current) as HTMLElement;

        if (ownerZoneElement !== root.current) {
          const ownerZone = allInstances[ownerZoneElement.getAttribute(FOCUSZONE_ID_ATTRIBUTE) as string];

          return !!ownerZone && ownerZone.focusElement(root.current);
        }

        return false;
      } else if (
        !forceIntoFirstElement &&
        internalState.activeElement &&
        elementContains(root.current, internalState.activeElement) &&
        isElementTabbable(internalState.activeElement)
      ) {
        internalState.activeElement.focus();
        return true;
      } else {
        const firstChild = root.current.firstChild as HTMLElement;

        return focusElement(getNextElement(root.current, firstChild, true) as HTMLElement);
      }
    }
    return false;
  };

  /**
   * Sets focus to a specific child element within the zone. This can be used in conjunction with
   * shouldReceiveFocus to create delayed focus scenarios (like animate the scroll position to the correct
   * location and then focus.)
   * @param element - The child element within the zone to focus.
   * @returns True if focus could be set to an active element, false if no operation was taken.
   */
  const focusElement = (element: HTMLElement): boolean => {
    if ((shouldReceiveFocus && !shouldReceiveFocus(element)) || (onBeforeFocus && !onBeforeFocus(element))) {
      return false;
    }

    if (element) {
      // when we Set focus to a specific child, we should recalculate the alignment depend on its position
      setActiveElement(element);
      if (internalState.activeElement) {
        internalState.activeElement.focus();
      }

      return true;
    }

    return false;
  };

  /**
   * Sets focus to the last tabbable item in the zone.
   * @returns True if focus could be set to an active element, false if no operation was taken.
   */
  const focusLast = (): boolean => {
    if (root.current) {
      const lastChild = root.current && (root.current.lastChild as HTMLElement | null);

      return focusElement(getPreviousElement(root.current, lastChild, true, true, true) as HTMLElement);
    }

    return false;
  };

  /**
   * Forces horizontal alignment in the context of vertical arrowing to use specific point as the reference,
   * rather than a center based on the last horizontal motion.
   * @param point - the new reference point.
   */
  const setFocusAlignment = (point: Point): void => {
    internalState.focusAlignment = point;
  };

  /**
   * When focus is in the zone at render time but then all focusable elements are removed,
   * we "park" focus temporarily on the root. Once we update with focusable children, we restore
   * focus to the closest path from previous. If the user tabs away from the parked container,
   * we restore focusability to the pre-parked state.
   */
  const setParkedFocus = (isParkedProp: boolean): void => {
    if (root.current && internalState.isParked !== isParkedProp) {
      internalState.isParked = isParkedProp;

      if (isParkedProp) {
        if (!allowFocusRoot) {
          internalState.parkedTabIndex = root.current.getAttribute('tabindex');
          root.current.setAttribute('tabindex', '-1');
        }
        root.current.focus();
      } else if (!allowFocusRoot) {
        if (internalState.parkedTabIndex) {
          root.current.setAttribute('tabindex', internalState.parkedTabIndex);
          internalState.parkedTabIndex = undefined;
        } else {
          root.current.removeAttribute('tabindex');
        }
      }
    }
  };

  const onFocus = (ev: React.FocusEvent<HTMLElement>): void => {
    if (portalContainsElement(ev.target as HTMLElement)) {
      // If the event target is inside a portal do not process the event.
      return;
    }
    const isImmediateDescendant = isImmediateDescendantOfZone(ev.target as HTMLElement);
    let newActiveElement: HTMLElement | null | undefined;

    if (onFocus) {
      onFocus(ev);
    } else if (onFocusNotification) {
      onFocusNotification();
    }

    if (isImmediateDescendant) {
      newActiveElement = ev.target as HTMLElement;
    } else {
      let parentElement = ev.target as HTMLElement;

      while (parentElement && parentElement !== root.current) {
        if (isElementTabbable(parentElement) && isImmediateDescendantOfZone(parentElement)) {
          newActiveElement = parentElement;
          break;
        }
        parentElement = getParent(parentElement, ALLOW_VIRTUAL_ELEMENTS) as HTMLElement;
      }
    }

    // If an inner focusable element should be focused when FocusZone container receives focus
    if (shouldFocusInnerElementWhenReceivedFocus && ev.target === root.current) {
      const maybeElementToFocus =
        defaultTabbableElement && typeof defaultTabbableElement === 'function' && defaultTabbableElement(root.current);

      // try to focus defaultTabbable element
      if (maybeElementToFocus && isElementTabbable(maybeElementToFocus)) {
        newActiveElement = maybeElementToFocus;
        maybeElementToFocus.focus();
      } else {
        // force focus on first focusable element
        focus(true);
        if (internalState.activeElement) {
          // set to null as new active element was handled in method above
          newActiveElement = null;
        }
      }
    }

    const initialElementFocused = !internalState.activeElement;

    // If the new active element is a child of this zone and received focus,
    // update alignment an immediate descendant
    if (newActiveElement && newActiveElement !== internalState.activeElement) {
      if (isImmediateDescendant || initialElementFocused) {
        setFocusAlignment(newActiveElement, true, true);
      }

      internalState.activeElement = newActiveElement;

      if (initialElementFocused) {
        updateTabIndexes();
      }
    }

    if (onActiveElementChanged) {
      onActiveElementChanged(internalState.activeElement as HTMLElement, ev);
    }

    if (stopFocusPropagation || doNotAllowFocusEventToPropagate) {
      ev.stopPropagation();
    }
  };

  const onBlur = (): void => {
    setParkedFocus(false);
  };

  const onMouseDown = (ev: React.MouseEvent<HTMLElement>): void => {
    if (portalContainsElement(ev.target as HTMLElement)) {
      // If the event target is inside a portal do not process the event.
      return;
    }

    if (disabled) {
      return;
    }

    let target = ev.target as HTMLElement;
    const path = [];

    while (target && target !== root.current) {
      path.push(target);
      target = getParent(target, ALLOW_VIRTUAL_ELEMENTS) as HTMLElement;
    }

    while (path.length) {
      target = path.pop() as HTMLElement;

      if (target && isElementTabbable(target)) {
        setActiveElement(target, true);
      }

      if (isElementFocusZone(target)) {
        // Stop here since the focus zone will take care of its own children.
        break;
      }
    }
  };

  const setActiveElement = (element: HTMLElement, forceAlignment?: boolean): void => {
    const previousActiveElement = internalState.activeElement;

    internalState.activeElement = element;

    if (previousActiveElement) {
      if (isElementFocusZone(previousActiveElement)) {
        updateTabIndexes(previousActiveElement);
      }

      previousActiveElement.tabIndex = -1;
    }

    if (internalState.activeElement) {
      if (!internalState.focusAlignment || forceAlignment) {
        setFocusAlignment(element, true, true);
      }

      internalState.activeElement.tabIndex = 0;
    }
  };

  const preventDefaultWhenHandled = (ev: React.KeyboardEvent<HTMLElement>): void => {
    preventDefaultWhenHandled && ev.preventDefault();
  };

  /**
   * Handle the keystrokes.
   */
  const onKeyDown = (ev: React.KeyboardEvent<HTMLElement>): boolean | undefined => {
    if (portalContainsElement(ev.target as HTMLElement)) {
      // If the event target is inside a portal do not process the event.
      return;
    }

    if (disabled) {
      return;
    }

    onKeyDown?.(ev);

    // If the default has been prevented, do not process keyboard events.
    if (ev.isDefaultPrevented()) {
      return;
    }

    if (getDocument().activeElement === root.current && internalState.isInnerZone) {
      // If this element has focus, it is being controlled by a parent.
      // Ignore the keystroke.
      return;
    }

    if (
      ((shouldEnterInnerZone && shouldEnterInnerZone(ev)) || (isInnerZoneKeystroke && isInnerZoneKeystroke(ev))) &&
      isImmediateDescendantOfZone(ev.target as HTMLElement)
    ) {
      // Try to focus
      const innerZone = getFirstInnerZone();

      if (innerZone) {
        if (!innerZone.focus(true)) {
          return;
        }
      } else if (isElementFocusSubZone(ev.target as HTMLElement)) {
        if (
          !focusElement(
            getNextElement(
              ev.target as HTMLElement,
              (ev.target as HTMLElement).firstChild as HTMLElement,
              true,
            ) as HTMLElement,
          )
        ) {
          return;
        }
      } else {
        return;
      }
    } else if (ev.altKey) {
      return;
    } else {
      // eslint-disable-next-line @fluentui/deprecated-keyboard-event-props
      switch (ev.which) {
        case KeyCodes.space:
          if (tryInvokeClickForFocusable(ev.target as HTMLElement)) {
            break;
          }
          return;

        case KeyCodes.left:
          if (direction !== FocusZoneDirection.vertical) {
            preventDefaultWhenHandled(ev);
            if (moveFocusLeft()) {
              break;
            }
          }
          return;

        case KeyCodes.right:
          if (direction !== FocusZoneDirection.vertical) {
            preventDefaultWhenHandled(ev);
            if (moveFocusRight()) {
              break;
            }
          }
          return;

        case KeyCodes.up:
          if (direction !== FocusZoneDirection.horizontal) {
            preventDefaultWhenHandled(ev);
            if (moveFocusUp()) {
              break;
            }
          }
          return;

        case KeyCodes.down:
          if (direction !== FocusZoneDirection.horizontal) {
            preventDefaultWhenHandled(ev);
            if (moveFocusDown()) {
              break;
            }
          }
          return;
        case KeyCodes.pageDown:
          if (!pagingSupportDisabled && moveFocusPaging(true)) {
            break;
          }
          return;
        case KeyCodes.pageUp:
          if (!pagingSupportDisabled && moveFocusPaging(false)) {
            break;
          }
          return;

        case KeyCodes.tab:
          if (
            allowTabKey ||
            handleTabKey === FocusZoneTabbableElements.all ||
            (handleTabKey === FocusZoneTabbableElements.inputOnly && isElementInput(ev.target as HTMLElement))
          ) {
            let focusChanged = false;
            internalState.processingTabKey = true;
            if (
              direction === FocusZoneDirection.vertical ||
              !shouldWrapFocus(internalState.activeElement as HTMLElement, NO_HORIZONTAL_WRAP)
            ) {
              focusChanged = ev.shiftKey ? moveFocusUp() : moveFocusDown();
            } else {
              const tabWithDirection = getRTL() ? !ev.shiftKey : ev.shiftKey;
              focusChanged = tabWithDirection ? moveFocusLeft() : moveFocusRight();
            }
            internalState.processingTabKey = false;
            if (focusChanged) {
              break;
            } else if (shouldResetActiveElementWhenTabFromZone) {
              internalState.activeElement = null;
            }
          }
          return;

        case KeyCodes.home:
          if (
            isContentEditableElement(ev.target as HTMLElement) ||
            (isElementInput(ev.target as HTMLElement) && !shouldInputLoseFocus(ev.target as HTMLInputElement, false))
          ) {
            return false;
          }
          const firstChild = root.current && (root.current.firstChild as HTMLElement | null);
          if (
            root.current &&
            firstChild &&
            focusElement(getNextElement(root.current, firstChild, true) as HTMLElement)
          ) {
            break;
          }
          return;

        case KeyCodes.end:
          if (
            isContentEditableElement(ev.target as HTMLElement) ||
            (isElementInput(ev.target as HTMLElement) && !shouldInputLoseFocus(ev.target as HTMLInputElement, true))
          ) {
            return false;
          }

          const lastChild = root.current && (root.current.lastChild as HTMLElement | null);
          if (
            root.current &&
            focusElement(getPreviousElement(root.current, lastChild, true, true, true) as HTMLElement)
          ) {
            break;
          }
          return;

        case KeyCodes.enter:
          if (tryInvokeClickForFocusable(ev.target as HTMLElement)) {
            break;
          }
          return;

        default:
          return;
      }
    }

    ev.preventDefault();
    ev.stopPropagation();
  };

  /**
   * Walk up the dom try to find a focusable element.
   */
  const tryInvokeClickForFocusable = (target: HTMLElement): boolean => {
    if (target === root.current || !shouldRaiseClicks) {
      return false;
    }

    do {
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      ) {
        return false;
      }

      if (
        isImmediateDescendantOfZone(target) &&
        target.getAttribute(IS_FOCUSABLE_ATTRIBUTE) === 'true' &&
        target.getAttribute(IS_ENTER_DISABLED_ATTRIBUTE) !== 'true'
      ) {
        raiseClick(target);
        return true;
      }

      target = getParent(target, ALLOW_VIRTUAL_ELEMENTS) as HTMLElement;
    } while (target !== root.current);

    return false;
  };

  /**
   * Traverse to find first child zone.
   */
  const getFirstInnerZone = (rootElement?: HTMLElement | null): FocusZone | null => {
    rootElement = rootElement || internalState.activeElement || root.current;

    if (!rootElement) {
      return null;
    }

    if (isElementFocusZone(rootElement)) {
      return allInstances[rootElement.getAttribute(FOCUSZONE_ID_ATTRIBUTE) as string];
    }

    let child = rootElement.firstElementChild as HTMLElement | null;

    while (child) {
      if (isElementFocusZone(child)) {
        return allInstances[child.getAttribute(FOCUSZONE_ID_ATTRIBUTE) as string];
      }
      const match = getFirstInnerZone(child);

      if (match) {
        return match;
      }

      child = child.nextElementSibling as HTMLElement | null;
    }

    return null;
  };

  const moveFocus = (
    isForward: boolean,
    getDistanceFromCenter: (activeRect: ClientRect, targetRect: ClientRect) => number,
    ev?: Event,
    useDefaultWrap: boolean = true,
  ): boolean => {
    let element = internalState.activeElement;
    let candidateDistance = -1;
    let candidateElement: HTMLElement | undefined = undefined;
    let changedFocus = false;
    const isBidirectional = direction === FocusZoneDirection.bidirectional;

    if (!element || !root.current) {
      return false;
    }

    if (isElementInput(element)) {
      if (!shouldInputLoseFocus(element as HTMLInputElement, isForward)) {
        return false;
      }
    }

    const activeRect = isBidirectional ? element.getBoundingClientRect() : null;

    do {
      element = (isForward
        ? getNextElement(root.current, element)
        : getPreviousElement(root.current, element)) as HTMLElement;

      if (isBidirectional) {
        if (element) {
          const targetRect = element.getBoundingClientRect();
          const elementDistance = getDistanceFromCenter(activeRect as ClientRect, targetRect);

          if (elementDistance === -1 && candidateDistance === -1) {
            candidateElement = element;
            break;
          }

          if (elementDistance > -1 && (candidateDistance === -1 || elementDistance < candidateDistance)) {
            candidateDistance = elementDistance;
            candidateElement = element;
          }

          if (candidateDistance >= 0 && elementDistance < 0) {
            break;
          }
        }
      } else {
        candidateElement = element;
        break;
      }
    } while (element);

    // Focus the closest candidate
    if (candidateElement && candidateElement !== internalState.activeElement) {
      changedFocus = true;
      focusElement(candidateElement);
    } else if (isCircularNavigation && useDefaultWrap) {
      if (isForward) {
        return focusElement(
          getNextElement(root.current, root.current.firstElementChild as HTMLElement, true) as HTMLElement,
        );
      } else {
        return focusElement(
          getPreviousElement(
            root.current,
            root.current.lastElementChild as HTMLElement,
            true,
            true,
            true,
          ) as HTMLElement,
        );
      }
    }
    return changedFocus;
  };

  const moveFocusDown = (): boolean => {
    let targetTop = -1;
    // eslint-disable-next-line deprecation/deprecation
    const leftAlignment = internalState.focusAlignment.left || internalState.focusAlignment.x || 0;

    if (
      moveFocus(true, (activeRect: ClientRect, targetRect: ClientRect) => {
        let distance = -1;
        // ClientRect values can be floats that differ by very small fractions of a decimal.
        // If the difference between top and bottom are within a pixel then we should treat
        // them as equivalent by using Math.floor. For instance 5.2222 and 5.222221 should be equivalent,
        // but without Math.Floor they will be handled incorrectly.
        const targetRectTop = Math.floor(targetRect.top);
        const activeRectBottom = Math.floor(activeRect.bottom);

        if (targetRectTop < activeRectBottom) {
          if (!shouldWrapFocus(internalState.activeElement as HTMLElement, NO_VERTICAL_WRAP)) {
            return LARGE_NEGATIVE_DISTANCE_FROM_CENTER;
          }

          return LARGE_DISTANCE_FROM_CENTER;
        }

        if ((targetTop === -1 && targetRectTop >= activeRectBottom) || targetRectTop === targetTop) {
          targetTop = targetRectTop;
          if (leftAlignment >= targetRect.left && leftAlignment <= targetRect.left + targetRect.width) {
            distance = 0;
          } else {
            distance = Math.abs(targetRect.left + targetRect.width / 2 - leftAlignment);
          }
        }

        return distance;
      })
    ) {
      setFocusAlignment(internalState.activeElement as HTMLElement, false, true);
      return true;
    }

    return false;
  };

  const moveFocusUp = (): boolean => {
    let targetTop = -1;
    // eslint-disable-next-line deprecation/deprecation
    const leftAlignment = internalState.focusAlignment.left || internalState.focusAlignment.x || 0;

    if (
      moveFocus(false, (activeRect: ClientRect, targetRect: ClientRect) => {
        let distance = -1;
        // ClientRect values can be floats that differ by very small fractions of a decimal.
        // If the difference between top and bottom are within a pixel then we should treat
        // them as equivalent by using Math.floor. For instance 5.2222 and 5.222221 should be equivalent,
        // but without Math.Floor they will be handled incorrectly.
        const targetRectBottom = Math.floor(targetRect.bottom);
        const targetRectTop = Math.floor(targetRect.top);
        const activeRectTop = Math.floor(activeRect.top);

        if (targetRectBottom > activeRectTop) {
          if (!shouldWrapFocus(internalState.activeElement as HTMLElement, NO_VERTICAL_WRAP)) {
            return LARGE_NEGATIVE_DISTANCE_FROM_CENTER;
          }
          return LARGE_DISTANCE_FROM_CENTER;
        }

        if ((targetTop === -1 && targetRectBottom <= activeRectTop) || targetRectTop === targetTop) {
          targetTop = targetRectTop;
          if (leftAlignment >= targetRect.left && leftAlignment <= targetRect.left + targetRect.width) {
            distance = 0;
          } else {
            distance = Math.abs(targetRect.left + targetRect.width / 2 - leftAlignment);
          }
        }

        return distance;
      })
    ) {
      setFocusAlignment(internalState.activeElement as HTMLElement, false, true);
      return true;
    }

    return false;
  };

  const moveFocusLeft = (): boolean => {
    const shouldWrap = shouldWrapFocus(internalState.activeElement as HTMLElement, NO_HORIZONTAL_WRAP);
    if (
      moveFocus(
        getRTL(),
        (activeRect: ClientRect, targetRect: ClientRect) => {
          let distance = -1;
          let topBottomComparison;

          if (getRTL()) {
            // When in RTL, this comparison should be the same as the one in _moveFocusRight for LTR.
            // Going left at a leftmost rectangle will go down a line instead of up a line like in LTR.
            // This is important, because we want to be comparing the top of the target rect
            // with the bottom of the active rect.
            topBottomComparison = parseFloat(targetRect.top.toFixed(3)) < parseFloat(activeRect.bottom.toFixed(3));
          } else {
            topBottomComparison = parseFloat(targetRect.bottom.toFixed(3)) > parseFloat(activeRect.top.toFixed(3));
          }

          if (
            topBottomComparison &&
            targetRect.right <= activeRect.right &&
            direction !== FocusZoneDirection.vertical
          ) {
            distance = activeRect.right - targetRect.right;
          } else if (!shouldWrap) {
            distance = LARGE_NEGATIVE_DISTANCE_FROM_CENTER;
          }

          return distance;
        },
        undefined /*ev*/,
        shouldWrap,
      )
    ) {
      setFocusAlignment(internalState.activeElement as HTMLElement, true, false);
      return true;
    }

    return false;
  };

  const moveFocusRight = (): boolean => {
    const shouldWrap = shouldWrapFocus(internalState.activeElement as HTMLElement, NO_HORIZONTAL_WRAP);
    if (
      moveFocus(
        !getRTL(),
        (activeRect: ClientRect, targetRect: ClientRect) => {
          let distance = -1;
          let topBottomComparison;

          if (getRTL()) {
            // When in RTL, this comparison should be the same as the one in _moveFocusLeft for LTR.
            // Going right at a rightmost rectangle will go up a line instead of down a line like in LTR.
            // This is important, because we want to be comparing the bottom of the target rect
            // with the top of the active rect.
            topBottomComparison = parseFloat(targetRect.bottom.toFixed(3)) > parseFloat(activeRect.top.toFixed(3));
          } else {
            topBottomComparison = parseFloat(targetRect.top.toFixed(3)) < parseFloat(activeRect.bottom.toFixed(3));
          }

          if (topBottomComparison && targetRect.left >= activeRect.left && direction !== FocusZoneDirection.vertical) {
            distance = targetRect.left - activeRect.left;
          } else if (!shouldWrap) {
            distance = LARGE_NEGATIVE_DISTANCE_FROM_CENTER;
          }

          return distance;
        },
        undefined /*ev*/,
        shouldWrap,
      )
    ) {
      setFocusAlignment(internalState.activeElement as HTMLElement, true, false);
      return true;
    }

    return false;
  };

  const getHorizontalDistanceFromCenter = (
    isForward: boolean,
    activeRect: ClientRect,
    targetRect: ClientRect,
  ): number => {
    const leftAlignment = internalState.focusAlignment.left || internalState.focusAlignment.x || 0;
    // ClientRect values can be floats that differ by very small fractions of a decimal.
    // If the difference between top and bottom are within a pixel then we should treat
    // them as equivalent by using Math.floor. For instance 5.2222 and 5.222221 should be equivalent,
    // but without Math.Floor they will be handled incorrectly.
    const targetRectTop = Math.floor(targetRect.top);
    const activeRectBottom = Math.floor(activeRect.bottom);
    const targetRectBottom = Math.floor(targetRect.bottom);
    const activeRectTop = Math.floor(activeRect.top);
    const isValidCandidateOnpagingDown = isForward && targetRectTop > activeRectBottom;
    const isValidCandidateOnpagingUp = !isForward && targetRectBottom < activeRectTop;

    if (isValidCandidateOnpagingDown || isValidCandidateOnpagingUp) {
      if (leftAlignment >= targetRect.left && leftAlignment <= targetRect.left + targetRect.width) {
        return 0;
      }
      return Math.abs(targetRect.left + targetRect.width / 2 - leftAlignment);
    }

    if (!shouldWrapFocus(activeElement as HTMLElement, NO_VERTICAL_WRAP)) {
      return LARGE_NEGATIVE_DISTANCE_FROM_CENTER;
    }
    return LARGE_DISTANCE_FROM_CENTER;
  };

  const moveFocusPaging = (isForward: boolean, useDefaultWrap: boolean = true): boolean => {
    let element = internalState.activeElement;
    if (!element || !root.current) {
      return false;
    }
    if (isElementInput(element)) {
      if (!shouldInputLoseFocus(element as HTMLInputElement, isForward)) {
        return false;
      }
    }
    const scrollableParent = findScrollableParent(element);
    if (!scrollableParent) {
      return false;
    }
    let candidateDistance = -1;
    let candidateElement = undefined;
    let targetTop = -1;
    let targetBottom = -1;
    const pagesize = (scrollableParent as HTMLElement).clientHeight;
    const activeRect = element.getBoundingClientRect();
    do {
      element = isForward ? getNextElement(root.current, element) : getPreviousElement(root.current, element);
      if (element) {
        const targetRect = element.getBoundingClientRect();
        const targetRectTop = Math.floor(targetRect.top);
        const activeRectBottom = Math.floor(activeRect.bottom);
        const targetRectBottom = Math.floor(targetRect.bottom);
        const activeRectTop = Math.floor(activeRect.top);
        const elementDistance = getHorizontalDistanceFromCenter(isForward, activeRect, targetRect);
        const isElementPassedPageSizeOnPagingDown = isForward && targetRectTop > activeRectBottom + pagesize;
        const isElementPassedPageSizeOnPagingUp = !isForward && targetRectBottom < activeRectTop - pagesize;

        if (isElementPassedPageSizeOnPagingDown || isElementPassedPageSizeOnPagingUp) {
          break;
        }
        if (elementDistance > -1) {
          // for paging down
          if (isForward && targetRectTop > targetTop) {
            targetTop = targetRectTop;
            candidateDistance = elementDistance;
            candidateElement = element;
          } else if (!isForward && targetRectBottom < targetBottom) {
            // for paging up
            targetBottom = targetRectBottom;
            candidateDistance = elementDistance;
            candidateElement = element;
          } else if (candidateDistance === -1 || elementDistance <= candidateDistance) {
            candidateDistance = elementDistance;
            candidateElement = element;
          }
        }
      }
    } while (element);

    let changedFocus = false;
    // Focus the closest candidate
    if (candidateElement && candidateElement !== internalState.activeElement) {
      changedFocus = true;
      focusElement(candidateElement);
      setFocusAlignment(candidateElement as HTMLElement, false, true);
    } else if (isCircularNavigation && useDefaultWrap) {
      if (isForward) {
        return focusElement(
          getNextElement(root.current, root.current.firstElementChild as HTMLElement, true) as HTMLElement,
        );
      }
      return focusElement(
        getPreviousElement(root.current, root.current.lastElementChild as HTMLElement, true, true, true) as HTMLElement,
      );
    }
    return changedFocus;
  };

  const isImmediateDescendantOfZone = (element?: HTMLElement): boolean => {
    return getOwnerZone(element) === root.current;
  };

  const getOwnerZone = (element?: HTMLElement): HTMLElement | null => {
    let parentElement = getParent(element as HTMLElement, ALLOW_VIRTUAL_ELEMENTS);

    while (parentElement && parentElement !== root.current && parentElement !== getDocument().body) {
      if (isElementFocusZone(parentElement)) {
        return parentElement;
      }

      parentElement = getParent(parentElement, ALLOW_VIRTUAL_ELEMENTS);
    }

    return parentElement;
  };

  const updateTabIndexes = (element?: HTMLElement): void => {
    if (!internalState.activeElement && defaultTabbableElement && typeof defaultTabbableElement === 'function') {
      internalState.activeElement = defaultTabbableElement(root.current as HTMLElement);
    }

    if (!element && root.current) {
      internalState.defaultFocusElement = null;
      element = root.current;
      if (internalState.activeElement && !elementContains(element, internalState.activeElement)) {
        internalState.activeElement = null;
      }
    }

    // If active element changes state to disabled, set it to null.
    // Otherwise, we lose keyboard accessibility to other elements in focus zone.
    if (internalState.activeElement && !isElementTabbable(internalState.activeElement)) {
      internalState.activeElement = null;
    }

    const childNodes = element && element.children;

    for (let childIndex = 0; childNodes && childIndex < childNodes.length; childIndex++) {
      const child = childNodes[childIndex] as HTMLElement;

      if (!isElementFocusZone(child)) {
        // If the item is explicitly set to not be focusable then TABINDEX needs to be set to -1.
        if (child.getAttribute && child.getAttribute(IS_FOCUSABLE_ATTRIBUTE) === 'false') {
          child.setAttribute(TABINDEX, '-1');
        }

        if (isElementTabbable(child)) {
          if (disabled) {
            child.setAttribute(TABINDEX, '-1');
          } else if (
            !internalState.isInnerZone &&
            ((!internalState.activeElement && !internalState.defaultFocusElement) ||
              internalState.activeElement === child)
          ) {
            internalState.defaultFocusElement = child;
            if (child.getAttribute(TABINDEX) !== '0') {
              child.setAttribute(TABINDEX, '0');
            }
          } else if (child.getAttribute(TABINDEX) !== '-1') {
            child.setAttribute(TABINDEX, '-1');
          }
        } else if (child.tagName === 'svg' && child.getAttribute('focusable') !== 'false') {
          // Disgusting IE hack. Sad face.
          child.setAttribute('focusable', 'false');
        }
      } else if (child.getAttribute(IS_FOCUSABLE_ATTRIBUTE) === 'true') {
        if (
          !internalState.isInnerZone &&
          ((!internalState.activeElement && !internalState.defaultFocusElement) ||
            internalState.activeElement === child)
        ) {
          internalState.defaultFocusElement = child;
          if (child.getAttribute(TABINDEX) !== '0') {
            child.setAttribute(TABINDEX, '0');
          }
        } else if (child.getAttribute(TABINDEX) !== '-1') {
          child.setAttribute(TABINDEX, '-1');
        }
      }

      updateTabIndexes(child);
    }
  };

  const isContentEditableElement = (element: HTMLElement): boolean => {
    return element && element.getAttribute('contenteditable') === 'true';
  };

  const isElementInput = (element: HTMLElement): boolean => {
    if (
      element &&
      element.tagName &&
      (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea')
    ) {
      return true;
    }
    return false;
  };

  const shouldInputLoseFocus = (element: HTMLInputElement, isForward?: boolean): boolean => {
    // If a tab was used, we want to focus on the next element.
    if (
      !internalState.processingTabKey &&
      element &&
      element.type &&
      ALLOWED_INPUT_TYPES.indexOf(element.type.toLowerCase()) > -1
    ) {
      const selectionStart = element.selectionStart;
      const selectionEnd = element.selectionEnd;
      const isRangeSelected = selectionStart !== selectionEnd;
      const inputValue = element.value;
      const isReadonly = element.readOnly;

      // We shouldn't lose focus in the following cases:
      // 1. There is range selected.
      // 2. When selection start is larger than 0 and it is backward and not readOnly.
      // 3. when selection start is not the end of length, it is forward and not readOnly.
      // 4. We press any of the arrow keys when our handleTabKey isn't none or undefined (only losing focus if we hit
      // tab) and if shouldInputLoseFocusOnArrowKey is defined, if scenario prefers to not loose the focus which is
      // determined by calling the callback shouldInputLoseFocusOnArrowKey
      if (
        isRangeSelected ||
        (selectionStart! > 0 && !isForward && !isReadonly) ||
        (selectionStart !== inputValue.length && isForward && !isReadonly) ||
        (!!handleTabKey && !(shouldInputLoseFocusOnArrowKey && shouldInputLoseFocusOnArrowKey(element)))
      ) {
        return false;
      }
    }

    return true;
  };

  const shouldWrapFocus = (
    element: HTMLElement,
    noWrapDataAttribute: 'data-no-vertical-wrap' | 'data-no-horizontal-wrap',
  ): boolean => {
    return props.checkForNoWrap ? shouldWrapFocus(element, noWrapDataAttribute) : true;
  };

  /**
   * Returns true if the element is a descendant of the FocusZone through a React portal.
   */
  const portalContainsElement = (element: HTMLElement): boolean => {
    return element && !!root.current && portalContainsElement(element, root.current);
  };

  const getDocument = (): Document => {
    return getDocument(root.current)!;
  };

  evaluateFocusBeforeRender();

  return (
    <Tag
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      {...divProps}
      {
        // root props has been deprecated and should get removed.
        // it needs to be marked as "any" since root props expects a div element, but really Tag can
        // be any native element so typescript rightly flags this as a problem.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rootProps as any)
      }
      // Once the getClassName correctly memoizes inputs this should
      // be replaced so that className is passed to getRootClass and is included there so
      // the class names will always be in the same order.
      className={css(getRootClass(), className)}
      ref={mergedRef}
      data-focuszone-id={id}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onMouseDownCapture={onMouseDown}
    >
      {children}
    </Tag>
  );
});
