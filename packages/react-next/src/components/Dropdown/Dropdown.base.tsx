declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;

import * as React from 'react';
import {
  IStyleFunctionOrObject,
  KeyCodes,
  classNamesFunction,
  divProperties,
  findIndex,
  getDocument,
  getFirstFocusable,
  getId,
  getLastFocusable,
  getNativeProps,
  initializeComponentRef,
  isIOS,
  isMac,
  mergeAriaAttributeValues,
  safeRequestAnimationFrame,
  warn,
  warnDeprecations,
  warnMutuallyExclusive,
} from '../../Utilities';
import { Callout } from '../../Callout';
import { Checkbox, ICheckboxStyleProps, ICheckboxStyles } from '../../Checkbox';
import { CommandButton } from '../../Button';
import { DirectionalHint } from '../../common/DirectionalHint';
import {
  DropdownMenuItemType,
  IDropdownOption,
  IDropdownProps,
  IDropdownStyleProps,
  IDropdownStyles,
  IDropdown,
} from './Dropdown.types';
import { DropdownSizePosCache } from './utilities/DropdownSizePosCache';
import { FocusZone, FocusZoneDirection } from '../../FocusZone';
import { ICalloutPositionedInfo, RectangleEdge } from 'office-ui-fabric-react/lib/utilities/positioning';
import { Icon } from '../../Icon';
import { ILabelStyleProps, ILabelStyles, Label } from '../../Label';
import { IProcessedStyleSet } from '../../Styling';
import { IWithResponsiveModeState } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
import { KeytipData } from '../../KeytipData';
import { Panel, IPanelStyleProps, IPanelStyles } from '../../Panel';
import { ResponsiveMode, withResponsiveMode } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
import {
  SelectableOptionMenuItemType,
  getAllSelectedOptions,
  ISelectableDroppableTextProps,
} from 'office-ui-fabric-react/lib/utilities/selectableOption/index';
import { useId, useBoolean } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<IDropdownStyleProps, IDropdownStyles>();

/** Internal only props interface to support mixing in responsive mode */
export interface IDropdownInternalProps extends IDropdownProps, IWithResponsiveModeState {}

export interface IDropdownState {
  labelId: string;
  listId: string;
  optionId: string;
  isScrollIdle: boolean;
  scrollIdleDelay: number;
  scrollIdleTimeoutId: number | undefined;
  /** True if the most recent keydown event was for alt (option) or meta (command). */
  lastKeyDownWasAltOrMeta: boolean | undefined;
  sizePosCache: DropdownSizePosCache;
  /** Flag for tracking whether focus is triggered by click (alternatively triggered by keyboard nav) */
  isFocusedByClick: boolean;
  gotMouseMove: boolean;
  selectedIndices: number[];
  hasOpened: boolean;
}

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

// const useComponentRef = (
//   props: IDropdownInternalProps,
//   options: any[],
//   selectedIndices: any,
//   dropDown: React.RefObject<HTMLDivElement>,
//   isOpen: boolean,
//   selectedKey,
//   selectedKeys,
//   multiSelect,
//   notifyOnReselect,
// ) => {
//   React.useImperativeHandle(
//     props.componentRef,
//     () => ({
//       get selectedOptions(): IDropdownOption[] {
//         return getAllSelectedOptions(options, selectedIndices);
//       },

//       focus(shouldOpenOnFocus?: boolean): void {
//         if (dropDown.current) {
//           dropDown.current.focus();
//           if (shouldOpenOnFocus) {
//             toggleIsOpen();
//           }
//         }
//       },
//       copyArray(array: any[]): any[] {
//         const newArray = [];
//         for (const element of array) {
//           newArray.push(element);
//         }
//         return newArray;
//       },
//       setSelectedIndex(event: React.FormEvent<HTMLDivElement>, index: number): void {
//         selectedIndices = [];
//         const checked: boolean = selectedIndices ? selectedIndices.indexOf(index) > -1 : false;
//         let newIndexes: number[] = [];

//         index = Math.max(0, Math.min(options.length - 1, index));

//         // If this is a controlled component then no state change should take place.
//         if (selectedKey !== undefined || selectedKeys !== undefined) {
//           onOptionChange(event, options, index, checked, multiSelect);
//           return;
//         }

//         if (!multiSelect && !notifyOnReselect && index === selectedIndices[0]) {
//           return;
//         } else if (multiSelect) {
//           newIndexes = selectedIndices ? copyArray(selectedIndices) : [];
//           if (checked) {
//             const position = newIndexes.indexOf(index);
//             if (position > -1) {
//               // unchecked the current one
//               newIndexes.splice(position, 1);
//             }
//           } else {
//             // add the new selected index into the existing one
//             newIndexes.push(index);
//           }
//         } else {
//           // Set the selected option if this is an uncontrolled component
//           newIndexes = [index];
//         }

//         event.persist();
//         // Call onChange after state is updated
//         setSelectedIndices(newIndexes);
//         onOptionChange(event, options, index, checked, multiSelect);
//       },
//     }),
//     [options, selectedIndices],
//   );
// };

export const DropdownBase: React.FunctionComponent<IDropdownInternalProps> & { options: any[] } = (
  props: IDropdownInternalProps,
) => {
  const host = React.useRef<HTMLDivElement>(null);
  const focusZone = React.useRef<FocusZone>(null);
  const dropDown = React.useRef<HTMLDivElement>(null);
  const id = props.id || useId('Dropdown');
  const [isOpen, { setTrue: setIsOpenTrue, setFalse: setIsOpenFalse, toggle: toggleIsOpen }] = useBoolean(false);
  const [hasFocus, { setTrue: setHasFocusTrue, setFalse: setHasFocusFalse, toggle: toggleHasFocus }] = useBoolean(
    false,
  );

  const [selectedIndices, setSelectedIndices] = React.useState();
  const [calloutRenderEdge, setCalloutRenderEdge] = React.useState();

  const [state] = React.useState<IDropdownState>({
    labelId: id + '-label',
    listId: id + '-list',
    optionId: id + '-option',
    isScrollIdle: true,
    scrollIdleDelay: 250 /* ms */,
    scrollIdleTimeoutId: undefined,
    lastKeyDownWasAltOrMeta: undefined,
    sizePosCache: new DropdownSizePosCache(),
    gotMouseMove: false,
    isFocusedByClick: false,
    selectedIndices: [],
    hasOpened: false,
  });

  /**
   * Because the isDisabled prop is deprecated, we have had to repeat this logic all over the place.
   * This helper method avoids all the repetition.
   */
  const getDisabled: () => boolean | undefined = () => {
    let { disabled } = props;
    // tslint:disable-next-line:deprecation
    const { isDisabled } = props;
    // Remove this deprecation workaround at 1.0.0
    if (disabled === undefined) {
      disabled = isDisabled;
    }
    return disabled;
  };

  const callIsDisabled = getDisabled();

  /** Render text in dropdown input */
  const renderTitle = (items: IDropdownOption[]): JSX.Element => {
    const { multiSelectDelimiter = ', ' } = props;
    const displayTxt = items.map(i => i.text).join(multiSelectDelimiter);
    return <>{displayTxt}</>;
  };

  const renderSeparator = (item: IDropdownOption): JSX.Element | null => {
    const { index, key } = item;
    if (index! > 0) {
      return <div role="separator" key={key} className={classNames.dropdownDivider} />;
    }
    return null;
  };

  const renderHeader = (item: IDropdownOption): JSX.Element => {
    const { onRenderOption = renderOption } = props;
    const { key } = item;
    return (
      <div id={id} key={key} className={classNames.dropdownItemHeader}>
        {onRenderOption(item)}
      </div>
    );
  };

  const renderOption = (item: IDropdownOption): JSX.Element => {
    const { onRenderOption = renderOptionItem } = props;
    const isItemSelected =
      item.index !== undefined && selectedIndices ? selectedIndices.indexOf(item.index) > -1 : false;

    // select the right className based on the combination of selected/disabled
    const itemClassName = item.hidden // predicate: item hidden
      ? classNames.dropdownItemHidden
      : isItemSelected && item.disabled === true // predicate: both selected and disabled
      ? classNames.dropdownItemSelectedAndDisabled
      : isItemSelected // predicate: selected only
      ? classNames.dropdownItemSelected
      : item.disabled === true // predicate: disabled only
      ? classNames.dropdownItemDisabled
      : classNames.dropdownItem;

    const { title = item.text } = item;

    const multiSelectItemStyles = classNames.subComponentStyles
      ? (classNames.subComponentStyles.multiSelectItem as IStyleFunctionOrObject<ICheckboxStyleProps, ICheckboxStyles>)
      : undefined;

    return !props.multiSelect ? (
      <CommandButton
        id={state.listId + item.index}
        key={item.key}
        data-index={item.index}
        data-is-focusable={!item.disabled}
        disabled={item.disabled}
        className={itemClassName}
        onClick={onItemClick(item)}
        onMouseEnter={onItemMouseEnter.bind(id, item)}
        onMouseLeave={onMouseItemLeave.bind(id, item)}
        onMouseMove={onItemMouseMove.bind(id, item)}
        role="option"
        aria-selected={isItemSelected ? 'true' : 'false'}
        ariaLabel={item.ariaLabel}
        title={title}
        aria-posinset={state.sizePosCache.positionInSet(item.index)}
        aria-setsize={state.sizePosCache.optionSetSize}
      >
        {onRenderOption(item, onRenderOption)}
      </CommandButton>
    ) : (
      <Checkbox
        id={state.listId + item.index}
        key={item.key}
        data-index={item.index}
        data-is-focusable={!item.disabled}
        disabled={item.disabled}
        onChange={onItemClick(item)}
        inputProps={{
          onMouseEnter: onItemMouseEnter.bind(id, item),
          onMouseLeave: onMouseItemLeave.bind(id, item),
          onMouseMove: onItemMouseMove.bind(id, item),
        }}
        label={item.text}
        title={title}
        onRenderLabel={onRenderItemLabel.bind(id, item)}
        className={itemClassName}
        role="option"
        aria-selected={isItemSelected ? 'true' : 'false'}
        checked={isItemSelected}
        styles={multiSelectItemStyles}
        ariaPositionInSet={state.sizePosCache.positionInSet(item.index)}
        ariaSetSize={state.sizePosCache.optionSetSize}
      />
    );
  };

  const renderItem = (item: IDropdownOption): JSX.Element | null => {
    switch (item.itemType) {
      case SelectableOptionMenuItemType.Divider:
        return renderSeparator(item);
      case SelectableOptionMenuItemType.Header:
        return renderHeader(item);
      default:
        return renderOption(item);
    }
  };

  /** Render List of items */
  const onRenderList = (): JSX.Element => {
    const { onRenderItem = renderItem } = props;

    let queue: { id?: string; items: JSX.Element[] } = { items: [] };
    let renderedList: JSX.Element[] = [];

    const emptyQueue = (): void => {
      const newGroup = queue.id
        ? [
            <div role="group" key={queue.id} aria-labelledby={queue.id}>
              {queue.items}
            </div>,
          ]
        : queue.items;

      renderedList = [...renderedList, ...newGroup];
      // Flush items and id
      queue = { items: [] };
    };

    const placeRenderedOptionIntoQueue = (item: IDropdownOption, index: number) => {
      /*
      Case Header
        empty queue if it's not already empty
        ensure unique ID for header and set queue ID
        push header into queue
      Case Divider
        push divider into queue if not first item
        empty queue if not already empty
      Default
        push item into queue
    */
      switch (item.itemType) {
        case SelectableOptionMenuItemType.Header:
          queue.items.length > 0 && emptyQueue();

          queue.items.push(onRenderItem({ id: id + item.key, ...item, index })!);
          queue.id = id + item.key;
          break;
        case SelectableOptionMenuItemType.Divider:
          index > 0 && queue.items.push(onRenderItem({ ...item, index })!);

          queue.items.length > 0 && emptyQueue();
          break;
        default:
          queue.items.push(onRenderItem({ ...item, index })!);
      }
    };

    // Place options into the queue. Queue will be emptied anytime a Header or Divider is encountered
    props.options.forEach((item: IDropdownOption, index: number) => {
      placeRenderedOptionIntoQueue(item, index);
    });

    // Push remaining items into all renderedList
    queue.items.length > 0 && emptyQueue();

    return <>{renderedList}</>;
  };

  /** Wrap item list in a FocusZone */
  const renderFocusableList = (): JSX.Element => {
    return (
      <div
        className={classNames.dropdownItemsWrapper}
        onKeyDown={onZoneKeyDown}
        onKeyUp={onZoneKeyUp}
        ref={host}
        tabIndex={0}
      >
        <FocusZone
          ref={focusZone}
          direction={FocusZoneDirection.vertical}
          id={state.listId}
          className={classNames.dropdownItems}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={label && !ariaLabel ? state.labelId : undefined}
          aria-multiselectable={multiSelect}
        >
          {onRenderList()}
        </FocusZone>
      </div>
    );
  };

  /** Render Callout or Panel container and pass in list */
  const renderContainer = (): JSX.Element => {
    const { responsiveMode, dropdownWidth } = props;
    const isSmall = responsiveMode! <= ResponsiveMode.medium;

    const panelStyles = classNames.subComponentStyles
      ? (classNames.subComponentStyles.panel as IStyleFunctionOrObject<IPanelStyleProps, IPanelStyles>)
      : undefined;

    return isSmall ? (
      <Panel
        isOpen
        isLightDismiss
        onDismiss={setIsOpenFalse}
        hasCloseButton={false}
        styles={panelStyles}
        {...panelProps}
      >
        {renderFocusableList()}
      </Panel>
    ) : (
      <Callout
        isBeakVisible={false}
        gapSpace={0}
        doNotLayer={false}
        directionalHintFixed={false}
        directionalHint={DirectionalHint.bottomLeftEdge}
        {...calloutProps}
        className={classNames.callout}
        target={dropDown.current}
        onDismiss={setIsOpenFalse}
        onScroll={onScroll}
        onPositioned={onPositioned}
        calloutWidth={dropdownWidth || (dropDown.current ? dropDown.current.clientWidth : 0)}
      >
        {renderFocusableList()}
      </Callout>
    );
  };

  const renderLabel = (): JSX.Element | null => {
    const labelStyles = classNames.subComponentStyles
      ? (classNames.subComponentStyles.label as IStyleFunctionOrObject<ILabelStyleProps, ILabelStyles>)
      : undefined;

    return label ? (
      <Label
        className={classNames.label}
        id={state.labelId}
        required={required}
        styles={labelStyles}
        disabled={callIsDisabled}
      >
        {label}
      </Label>
    ) : null;
  };

  /** Render Caret Down Icon */
  const renderCaretDown = (): JSX.Element => {
    return <Icon className={classNames.caretDown} iconName="ChevronDown" aria-hidden />;
  };

  const renderOptionItem = (item: IDropdownOption): JSX.Element => {
    return <span className={classNames.dropdownOptionText}>{item.text}</span>;
  };

  /** Render custom label for drop down item */
  const onRenderItemLabel = (item: IDropdownOption): JSX.Element | null => {
    return renderOption(item);
  };

  const onPositioned = (positions?: ICalloutPositionedInfo): void => {
    if (focusZone.current) {
      // Focusing an element can trigger a reflow. Making this wait until there is an animation
      // frame can improve perf significantly.
      requestAnimationFrame(() => {
        const currentSelectedIndices = selectedIndices;
        if (focusZone.current) {
          if (
            currentSelectedIndices &&
            currentSelectedIndices[0] &&
            !props.options[currentSelectedIndices[0]].disabled
          ) {
            const element: HTMLElement | null = getDocument()!.getElementById(`${id}-list${currentSelectedIndices[0]}`);
            if (element) {
              focusZone.current.focusElement(element);
            }
          } else {
            focusZone.current.focus();
          }
        }
      });
    }
    if (!calloutRenderEdge || calloutRenderEdge !== positions!.targetEdge) {
      setCalloutRenderEdge(positions!.targetEdge);
    }
  };

  const onItemClick = (item: IDropdownOption): ((event: React.MouseEvent<HTMLDivElement>) => void) => {
    return (event: React.MouseEvent<HTMLDivElement>): void => {
      if (!item.disabled) {
        setSelectedIndex(event, item.index!);
        if (!props.multiSelect) {
          // only close the callout when it's in single-select mode
          toggleIsOpen;
        }
      }
    };
  };

  /**
   * Scroll handler for the callout to make sure the mouse events
   * for updating focus are not interacting during scroll
   */
  const onScroll = (): void => {
    if (!state.isScrollIdle && state.scrollIdleTimeoutId !== undefined) {
      clearTimeout(state.scrollIdleTimeoutId);
      state.scrollIdleTimeoutId = undefined;
    } else {
      state.isScrollIdle = false;
    }

    state.scrollIdleTimeoutId = setTimeout(() => {
      state.isScrollIdle = true;
    }, state.scrollIdleDelay);
  };

  const onItemMouseEnter = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
    if (shouldIgnoreMouseEvent()) {
      return;
    }

    const targetElement = ev.currentTarget as HTMLElement;
    targetElement.focus();
  };

  const onItemMouseMove = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
    const targetElement = ev.currentTarget as HTMLElement;
    state.gotMouseMove = true;

    if (!state.isScrollIdle || document.activeElement === targetElement) {
      return;
    }

    targetElement.focus();
  };

  const copyArray = (array: any[]): any[] => {
    const newArray = [];
    for (const element of array) {
      newArray.push(element);
    }
    return newArray;
  };

  const onOptionChange = (event: React.FormEvent<HTMLDivElement>, index: number, checked?: boolean) => {
    // tslint:disable-next-line:deprecation
    const { onChange, onChanged } = props;
    if (onChange || onChanged) {
      // for single-select, option passed in will always be selected.
      // for multi-select, flip the checked value
      const changedOpt = multiSelect ? { ...options[index], selected: !checked } : options[index];

      onChange && onChange({ ...event, target: dropDown.current as EventTarget }, changedOpt, index);
      onChanged && onChanged(changedOpt, index);
    }
  };

  const setSelectedIndex = (event: React.FormEvent<HTMLDivElement>, index: number): void => {
    const { notifyOnReselect } = props;
    const checked: boolean = selectedIndices ? selectedIndices.indexOf(index) > -1 : false;
    let newIndexes: number[] = [];

    index = Math.max(0, Math.min(options.length - 1, index));

    // If this is a controlled component then no state change should take place.
    if (selectedKey !== undefined || selectedKeys !== undefined) {
      onOptionChange(event, index, checked);
      return;
    }

    if (!multiSelect && !notifyOnReselect && index === selectedIndices[0]) {
      return;
    } else if (multiSelect) {
      newIndexes = selectedIndices ? copyArray(selectedIndices) : [];
      if (checked) {
        const position = newIndexes.indexOf(index);
        if (position > -1) {
          // unchecked the current one
          newIndexes.splice(position, 1);
        }
      } else {
        // add the new selected index into the existing one
        newIndexes.push(index);
      }
    } else {
      // Set the selected option if this is an uncontrolled component
      newIndexes = [index];
    }

    event.persist();
    // Call onChange after state is updated
    setSelectedIndices(newIndexes);
    onOptionChange(event, index, checked);
  };
  const onMouseItemLeave = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
    if (shouldIgnoreMouseEvent()) {
      return;
    }

    /**
     * IE11 focus() method forces parents to scroll to top of element.
     * Edge and IE expose a setActive() function for focusable divs that
     * sets the page focus but does not scroll the parent element.
     */
    if (host.current) {
      if ((host.current as any).setActive) {
        try {
          (host.current as any).setActive();
        } catch (e) {
          /* no-op */
        }
      } else {
        host.current.focus();
      }
    }
  };

  const moveIndex = (
    event: React.FormEvent<HTMLDivElement>,
    stepValue: number,
    index: number,
    selectedIndex: number,
  ): number => {
    // Return selectedIndex if nothing has changed or options is empty
    if (selectedIndex === index || options.length === 0) {
      return selectedIndex;
    }

    // If the user is pressing the up or down key we want to make
    // sure that the dropdown cycles through the options without
    // causing the screen to scroll. In _onDropdownKeyDown
    // at the very end is a check to see if newIndex !== selectedIndex.
    // If the index is less than 0 and we set it back to 0, then
    // newIndex will equal selectedIndex and not stop the action
    // of the key press happening and vice versa for indexes greater
    // than or equal to the options length.
    if (index >= options.length) {
      index = 0;
    } else if (index < 0) {
      index = options.length - 1;
    }

    let stepCounter = 0;
    // If current index is a header or divider, or disabled, increment by step
    while (
      options[index].itemType === DropdownMenuItemType.Header ||
      options[index].itemType === DropdownMenuItemType.Divider ||
      options[index].disabled
    ) {
      // If stepCounter exceeds length of options, then return selectedIndex (-1)
      if (stepCounter >= options.length) {
        return selectedIndex;
      }
      // If index + stepValue is out of bounds, wrap around
      if (index + stepValue < 0) {
        index = options.length;
      } else if (index + stepValue >= options.length) {
        index = -1;
      }

      index = index + stepValue;
      stepCounter++;
    }

    setSelectedIndex(event, index);
    return index;
  };

  const shouldIgnoreMouseEvent = (): boolean => {
    return !state.isScrollIdle || !state.gotMouseMove;
  };

  /** Get all selected indexes for multi-select mode */
  const getSelectedIndexes = (
    currentOptions: IDropdownOption[],
    currentSelectedKey: string | number | string[] | number[] | null | undefined,
  ): number[] => {
    if (currentSelectedKey === undefined) {
      if (props.multiSelect) {
        return getAllSelectedIndices(currentOptions);
      }
      const selectedIndex = getSelectedIndex(currentOptions, null);
      return selectedIndex !== -1 ? [selectedIndex] : [];
    } else if (!Array.isArray(currentSelectedKey)) {
      const selectedIndex = getSelectedIndex(currentOptions, currentSelectedKey);
      return selectedIndex !== -1 ? [selectedIndex] : [];
    }
    setSelectedIndices([]);
    for (const key of currentSelectedKey) {
      const selectedIndex = getSelectedIndex(currentOptions, key);
      selectedIndex !== -1 && selectedIndices.push(selectedIndex);
    }
    return selectedIndices;
  };

  const getAllSelectedIndices = (currentOptions: IDropdownOption[]): number[] => {
    return currentOptions
      .map((option: IDropdownOption, index: number) => (option.selected ? index : -1))
      .filter(index => index !== -1);
  };

  const getSelectedIndex = (currentOptions: IDropdownOption[], currentSelectedKey: string | number | null): number => {
    return findIndex(currentOptions, option => {
      // tslint:disable-next-line:triple-equals
      if (currentSelectedKey != null) {
        return option.key === currentSelectedKey;
      } else {
        // tslint:disable-next-line:deprecation
        return !!option.selected || !!option.isSelected;
      }
    });
  };

  const onDropdownBlur = (ev: React.FocusEvent<HTMLDivElement>): void => {
    // If Dropdown disabled do not proceed with this logic.

    if (callIsDisabled) {
      return;
    }

    // hasFocus tracks whether the root element has focus so always update the state.
    setHasFocusFalse();

    if (isOpen) {
      // Do not onBlur when the callout is opened
      return;
    }
    if (props.onBlur) {
      props.onBlur(ev);
    }
  };

  const onDropdownKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>): void => {
    // If Dropdown disabled do not process any keyboard events.
    if (callIsDisabled) {
      return;
    }

    // Take note if we are processing an alt (option) or meta (command) keydown.
    // See comment in _shouldHandleKeyUp for reasoning.
    state.lastKeyDownWasAltOrMeta = isAltOrMeta(ev);

    if (props.onKeyDown) {
      props.onKeyDown(ev);
      if (ev.defaultPrevented) {
        return;
      }
    }

    let newIndex: number | undefined;
    const selectedIndex = selectedIndices.length ? selectedIndices[0] : -1;
    const containsExpandCollapseModifier = ev.altKey || ev.metaKey;

    switch (ev.which) {
      case KeyCodes.enter:
        toggleIsOpen();
        break;

      case KeyCodes.escape:
        if (!isOpen) {
          return;
        }
        setIsOpenFalse();
        break;

      case KeyCodes.up:
        if (containsExpandCollapseModifier) {
          if (isOpen) {
            setIsOpenFalse();
            break;
          }

          return;
        }
        if (props.multiSelect) {
          setIsOpenTrue();
        } else if (!getDisabled()) {
          newIndex = moveIndex(ev, -1, selectedIndex - 1, selectedIndex);
        }
        break;

      case KeyCodes.down:
        if (containsExpandCollapseModifier) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        if ((containsExpandCollapseModifier && !isOpen) || props.multiSelect) {
          setIsOpenTrue();
        } else if (!getDisabled()) {
          newIndex = moveIndex(ev, 1, selectedIndex + 1, selectedIndex);
        }
        break;

      case KeyCodes.home:
        if (!props.multiSelect) {
          newIndex = moveIndex(ev, 1, 0, selectedIndex);
        }
        break;

      case KeyCodes.end:
        if (!props.multiSelect) {
          newIndex = moveIndex(ev, -1, props.options.length - 1, selectedIndex);
        }
        break;

      case KeyCodes.space:
        // event handled in _onDropdownKeyUp
        break;
      default:
        return;
    }

    if (newIndex !== selectedIndex) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  };

  const onDropdownKeyUp = (ev: React.KeyboardEvent<HTMLDivElement>): void => {
    // If Dropdown disabled do not process any keyboard events.
    if (callIsDisabled) {
      return;
    }

    const shouldHandleKey = shouldHandleKeyUp(ev);
    if (props.onKeyUp) {
      props.onKeyUp(ev);
      if (ev.defaultPrevented) {
        return;
      }
    }
    switch (ev.which) {
      case KeyCodes.space:
        toggleIsOpen();
        break;

      default:
        if (shouldHandleKey && isOpen) {
          toggleIsOpen();
        }
        return;
    }

    ev.stopPropagation();
    ev.preventDefault();
  };

  /**
   * Returns true if the key for the event is alt (Mac option) or meta (Mac command).
   */
  const isAltOrMeta = (ev: React.KeyboardEvent<HTMLElement>): boolean => {
    return ev.which === KeyCodes.alt || ev.key === 'Meta';
  };

  /**
   * We close the menu on key up only if ALL of the following are true:
   * - Most recent key down was alt or meta (command)
   * - The alt/meta key down was NOT followed by some other key (such as down/up arrow to
   *   expand/collapse the menu)
   * - We're not on a Mac (or iOS)
   *
   * This is because on Windows, pressing alt moves focus to the application menu bar or similar,
   * closing any open context menus. There is not a similar behavior on Macs.
   */
  const shouldHandleKeyUp = (ev: React.KeyboardEvent<HTMLElement>): boolean => {
    const keyPressIsAltOrMetaAlone = state.lastKeyDownWasAltOrMeta && isAltOrMeta(ev);
    state.lastKeyDownWasAltOrMeta = false;
    return !!keyPressIsAltOrMetaAlone && !(isMac() || isIOS());
  };

  const onZoneKeyDown = (ev: React.KeyboardEvent<HTMLElement>): void => {
    let elementToFocus;

    // Take note if we are processing an alt (option) or meta (command) keydown.
    // See comment in _shouldHandleKeyUp for reasoning.
    state.lastKeyDownWasAltOrMeta = isAltOrMeta(ev);
    const containsExpandCollapseModifier = ev.altKey || ev.metaKey;

    switch (ev.which) {
      case KeyCodes.up:
        if (containsExpandCollapseModifier) {
          toggleIsOpen();
        } else {
          if (host.current) {
            elementToFocus = getLastFocusable(host.current, host.current.lastChild as HTMLElement, true);
          }
        }
        break;

      // All directional keystrokes should be canceled when the zone is rendered.
      // This avoids the body scroll from reacting and thus dismissing the dropdown.
      case KeyCodes.home:
      case KeyCodes.end:
      case KeyCodes.pageUp:
      case KeyCodes.pageDown:
        break;

      case KeyCodes.down:
        if (!containsExpandCollapseModifier && host.current) {
          elementToFocus = getFirstFocusable(host.current, host.current.firstChild as HTMLElement, true);
        }
        break;

      case KeyCodes.escape:
        toggleIsOpen();
        break;

      case KeyCodes.tab:
        toggleIsOpen();
        return;

      default:
        return;
    }

    if (elementToFocus) {
      elementToFocus.focus();
    }

    ev.stopPropagation();
    ev.preventDefault();
  };

  const onZoneKeyUp = (ev: React.KeyboardEvent<HTMLElement>): void => {
    const shouldHandleKey = shouldHandleKeyUp(ev);

    if (shouldHandleKey && isOpen) {
      toggleIsOpen();
      ev.preventDefault();
    }
  };

  /**
   * Returns true if dropdown should set to open on focus.
   * Otherwise, isOpen state should be toggled on click
   */
  const shouldOpenOnFocus = (): boolean => {
    const { openOnKeyboardFocus } = props;
    return !state.isFocusedByClick && openOnKeyboardFocus === true && !hasFocus;
  };

  const onDropdownClick = (ev: React.MouseEvent<HTMLDivElement>): void => {
    if (props.onClick) {
      props.onClick(ev);
      if (ev.defaultPrevented) {
        return;
      }
    }

    if (!callIsDisabled && !shouldOpenOnFocus()) {
      toggleIsOpen;
    }

    state.isFocusedByClick = false; // reset
  };

  const onDropdownMouseDown = (): void => {
    state.isFocusedByClick = true;
  };

  const onFocus = (ev: React.FocusEvent<HTMLDivElement>): void => {
    if (!callIsDisabled) {
      if (!state.isFocusedByClick && !isOpen && selectedIndices.length === 0 && !multiSelect) {
        // Per aria: https://www.w3.org/TR/wai-aria-practices-1.1/#listbox_kbd_interaction
        moveIndex(ev, 1, 0, -1);
      }
      if (props.onFocus) {
        props.onFocus(ev);
      }

      setHasFocusTrue();
      if (shouldOpenOnFocus()) {
        setIsOpenTrue();
      }
    }
  };

  const {
    className,
    label,
    options,
    ariaLabel,
    required,
    errorMessage,
    keytipProps,
    styles: propStyles,
    theme,
    panelProps,
    calloutProps,
    multiSelect,
    onRenderTitle = renderTitle,
    onRenderContainer = renderContainer,
    onRenderCaretDown = renderCaretDown,
    onRenderLabel = renderLabel,
  } = props;

  /** Render placeholder text in dropdown input */
  const renderPlaceholder = (): JSX.Element | null => {
    /** Get either props.placeholder (new name) or props.placeHolder (old name) */
    // tslint:disable-next-line:deprecation
    const placeholder = props.placeholder || props.placeHolder;
    if (!placeholder) {
      return null;
    }
    return <>{placeholder}</>;
  };

  const onRenderPlaceholder = props.onRenderPlaceholder || props.onRenderPlaceHolder || renderPlaceholder;

  const selectedOptions = getAllSelectedOptions(options, selectedIndices);
  const divProps = getNativeProps(props, divProperties);
  const errorMessageId = id + '-errorMessage';
  const ariaActiveDescendant = callIsDisabled
    ? undefined
    : isOpen && selectedIndices.length === 1 && selectedIndices[0] >= 0
    ? state.listId + selectedIndices[0]
    : undefined;

  const ariaAttrs = multiSelect
    ? {
        role: 'button',
      }
    : // single select
      {
        role: 'listbox',
        childRole: 'option',
        ariaSetSize: state.sizePosCache.optionSetSize,
        ariaPosInSet: state.sizePosCache.positionInSet(selectedIndices[0]),
        ariaSelected: selectedIndices[0] === undefined ? undefined : true,
      };

  const classNames = getClassNames(propStyles, {
    theme,
    className,
    hasError: !!(errorMessage && errorMessage.length > 0),
    hasLabel: !!label,
    isOpen,
    required,
    disabled: callIsDisabled,
    isRenderingPlaceholder: !selectedOptions.length,
    panelClassName: !!panelProps ? panelProps.className : undefined,
    calloutClassName: !!calloutProps ? calloutProps.className : undefined,
    calloutRenderEdge: calloutRenderEdge,
  });

  const hasErrorMessage: boolean = !!errorMessage && errorMessage.length > 0;

  const requestAnimationFrame = safeRequestAnimationFrame(id);

  const { selectedKey, selectedKeys, defaultSelectedKey, defaultSelectedKeys } = props;

  if (process.env.NODE_ENV !== 'production') {
    warnDeprecations('Dropdown', props, {
      isDisabled: 'disabled',
      onChanged: 'onChange',
      placeHolder: 'placeholder',
      onRenderPlaceHolder: 'onRenderPlaceholder',
    });

    warnMutuallyExclusive('Dropdown', props, {
      defaultSelectedKey: 'selectedKey',
      defaultSelectedKeys: 'selectedKeys',
      selectedKeys: 'selectedKey',
    });

    if (multiSelect) {
      const warnMultiSelect = (prop: keyof IDropdownProps) =>
        warn(`Dropdown property '${prop}' cannot be used when 'multiSelect' is true. Use '${prop}s' instead.`);
      if (selectedKey !== undefined) {
        warnMultiSelect('selectedKey');
      }
      if (defaultSelectedKey !== undefined) {
        warnMultiSelect('defaultSelectedKey');
      }
    } else {
      const warnNotMultiSelect = (prop: keyof IDropdownProps) =>
        warn(`Dropdown property '${prop}s' cannot be used when 'multiSelect' is false/unset. Use '${prop}' instead.`);
      if (selectedKeys !== undefined) {
        warnNotMultiSelect('selectedKey');
      }
      if (defaultSelectedKeys !== undefined) {
        warnNotMultiSelect('defaultSelectedKey');
      }
    }
  }
  if (multiSelect) {
    state.selectedIndices = getSelectedIndexes(
      options,
      defaultSelectedKeys !== undefined ? defaultSelectedKeys : selectedKeys,
    );
  } else {
    state.selectedIndices = getSelectedIndexes(
      options,
      (defaultSelectedKey !== undefined ? defaultSelectedKey : selectedKey)!,
    );
  }
  state.sizePosCache.updateOptions(options);

  useUnmount(() => {
    clearTimeout(state.scrollIdleTimeoutId);
  });

  React.useEffect(() => {
    if (isOpen) {
      state.hasOpened = true;
    } else if (state.hasOpened) {
      state.gotMouseMove = false;
      if (props.onDismiss) {
        props.onDismiss();
      }
    }
  }, [isOpen]);

  return (
    <div className={classNames.root}>
      {onRenderLabel()}
      <KeytipData keytipProps={keytipProps} disabled={callIsDisabled}>
        {(keytipAttributes: any): JSX.Element => (
          <div
            {...keytipAttributes}
            data-is-focusable={!callIsDisabled}
            ref={dropDown}
            id={id}
            tabIndex={callIsDisabled ? -1 : 0}
            role={ariaAttrs.role}
            aria-haspopup="listbox"
            aria-expanded={isOpen ? 'true' : 'false'}
            aria-label={ariaLabel}
            aria-labelledby={label && !ariaLabel ? mergeAriaAttributeValues(state.labelId, state.optionId) : undefined}
            aria-describedby={mergeAriaAttributeValues(
              keytipAttributes['aria-describedby'],
              hasErrorMessage ? id + '-errorMessage' : undefined,
            )}
            aria-activedescendant={ariaActiveDescendant}
            aria-required={required}
            aria-disabled={callIsDisabled}
            aria-owns={isOpen ? state.listId : undefined}
            {...divProps}
            className={classNames.dropdown}
            onBlur={onDropdownBlur}
            onKeyDown={onDropdownKeyDown}
            onKeyUp={onDropdownKeyUp}
            onClick={onDropdownClick}
            onMouseDown={onDropdownMouseDown}
            onFocus={onFocus}
          >
            <span
              id={state.optionId}
              className={classNames.title}
              aria-live="polite"
              aria-atomic
              aria-invalid={hasErrorMessage}
              role={ariaAttrs.childRole}
              aria-setsize={ariaAttrs.ariaSetSize}
              aria-posinset={ariaAttrs.ariaPosInSet}
              aria-selected={ariaAttrs.ariaSelected}
            >
              {// If option is selected render title, otherwise render the placeholder text
              selectedOptions.length
                ? onRenderTitle(selectedOptions, onRenderTitle)
                : onRenderPlaceholder(props, onRenderPlaceholder)}
            </span>
            <span className={classNames.caretDownWrapper}>{onRenderCaretDown(props, onRenderCaretDown)}</span>
          </div>
        )}
      </KeytipData>
      {isOpen && onRenderContainer({ ...props, onDismiss: setIsOpenFalse }, onRenderContainer)}
      {hasErrorMessage && (
        <div role="alert" id={errorMessageId} className={classNames.errorMessage}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
