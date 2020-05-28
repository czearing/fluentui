// declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;

// import * as React from 'react';
// import {
//   IStyleFunctionOrObject,
//   KeyCodes,
//   classNamesFunction,
//   divProperties,
//   findIndex,
//   getDocument,
//   getFirstFocusable,
//   getId,
//   getLastFocusable,
//   getNativeProps,
//   initializeComponentRef,
//   isIOS,
//   isMac,
//   mergeAriaAttributeValues,
//   safeRequestAnimationFrame,
//   warn,
//   warnDeprecations,
//   warnMutuallyExclusive,
// } from '../../Utilities';
// import { Callout } from '../../Callout';
// import { Checkbox, ICheckboxStyleProps, ICheckboxStyles } from '../../Checkbox';
// import { CommandButton } from '../../Button';
// import { DirectionalHint } from '../../common/DirectionalHint';
// import {
//   DropdownMenuItemType,
//   IDropdownOption,
//   IDropdownProps,
//   IDropdownStyleProps,
//   IDropdownStyles,
//   IDropdown,
// } from './Dropdown.types';
// import { DropdownSizePosCache } from './utilities/DropdownSizePosCache';
// import { FocusZone, FocusZoneDirection } from '../../FocusZone';
// import { ICalloutPositionedInfo, RectangleEdge } from 'office-ui-fabric-react/lib/utilities/positioning';
// import { Icon } from '../../Icon';
// import { ILabelStyleProps, ILabelStyles, Label } from '../../Label';
// import { IProcessedStyleSet } from '../../Styling';
// import { IWithResponsiveModeState } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
// import { KeytipData } from '../../KeytipData';
// import { Panel, IPanelStyleProps, IPanelStyles } from '../../Panel';
// import { ResponsiveMode, withResponsiveMode } from 'office-ui-fabric-react/lib/utilities/decorators/withResponsiveMode';
// import {
//   SelectableOptionMenuItemType,
//   getAllSelectedOptions,
//   ISelectableDroppableTextProps,
// } from 'office-ui-fabric-react/lib/utilities/selectableOption/index';
// import { useId, useBoolean } from '@uifabric/react-hooks';

// const getClassNames = classNamesFunction<IDropdownStyleProps, IDropdownStyles>();

// /** Internal only props interface to support mixing in responsive mode */
// export interface IDropdownInternalProps extends IDropdownProps, IWithResponsiveModeState {}

// export interface IDropdownState {
//   labelId: string;
//   listId: string;
//   optionId: string;
//   isScrollIdle: boolean;
//   scrollIdleDelay: number;
//   scrollIdleTimeoutId: number | undefined;
//   /** True if the most recent keydown event was for alt (option) or meta (command). */
//   lastKeyDownWasAltOrMeta: boolean | undefined;
//   sizePosCache: DropdownSizePosCache;
//   /** Flag for tracking whether focus is triggered by click (alternatively triggered by keyboard nav) */
//   isFocusedByClick: boolean;
//   gotMouseMove: boolean;
//   selectedIndices: number[];
// }

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
//           onChange(event, options, index, checked, multiSelect);
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
//         onChange(event, options, index, checked, multiSelect);
//       },
//     }),
//     [options, selectedIndices],
//   );
// };

// export const DropdownBase: React.FunctionComponent<IDropdownInternalProps> & { options: any[] } = (
//   props: IDropdownInternalProps,
// ) => {
//   const host = React.useRef<HTMLDivElement>(null);
//   const focusZone = React.useRef<FocusZone>(null);
//   const dropDown = React.useRef<HTMLDivElement>(null);
//   const id = props.id || useId('Dropdown');
//   const [isOpen, { toggle: toggleIsOpen }] = useBoolean(false);
//   const [hasFocus, { toggle: toggleHasFocus }] = useBoolean(false);
//   const [selectedIndices, setSelectedIndices] = React.useState();
//   const [calloutRenderEdge, setCalloutRenderEdge] = React.useState();

//   const [state] = React.useState<IDropdownState>({
//     labelId: id + '-label',
//     listId: id + '-list',
//     optionId: id + '-option',
//     isScrollIdle: true,
//     scrollIdleDelay: 250 /* ms */,
//     scrollIdleTimeoutId: undefined,
//     lastKeyDownWasAltOrMeta: undefined,
//     sizePosCache: new DropdownSizePosCache(),
//     gotMouseMove: false,
//     isFocusedByClick: false,
//     selectedIndices: [],
//   });

//   /** Render text in dropdown input */
//   const renderTitle = (items: IDropdownOption[]): JSX.Element => {
//     const { multiSelectDelimiter = ', ' } = props;
//     const displayTxt = items.map(i => i.text).join(multiSelectDelimiter);
//     return <>{displayTxt}</>;
//   };

//   /** Render Callout or Panel container and pass in list */
//   const renderContainer = (): JSX.Element => {
//     const { responsiveMode, dropdownWidth } = props;
//     const isSmall = responsiveMode! <= ResponsiveMode.medium;

//     const panelStyles = classNames.subComponentStyles
//       ? (classNames.subComponentStyles.panel as IStyleFunctionOrObject<IPanelStyleProps, IPanelStyles>)
//       : undefined;

//     return isSmall ? (
//       <Panel isOpen isLightDismiss onDismiss={onDismiss} hasCloseButton={false} styles={panelStyles} {...panelProps}>
//         {renderFocusableList(props)}
//       </Panel>
//     ) : (
//       <Callout
//         isBeakVisible={false}
//         gapSpace={0}
//         doNotLayer={false}
//         directionalHintFixed={false}
//         directionalHint={DirectionalHint.bottomLeftEdge}
//         {...calloutProps}
//         className={classNames.callout}
//         target={dropDown.current}
//         onDismiss={onDismiss}
//         onScroll={onScroll}
//         onPositioned={onPositioned}
//         calloutWidth={dropdownWidth || (dropDown.current ? dropDown.current.clientWidth : 0)}
//       >
//         {renderFocusableList(props)}
//       </Callout>
//     );
//   };

//   const renderLabel = (): JSX.Element | null => {
//     const labelStyles = classNames.subComponentStyles
//       ? (classNames.subComponentStyles.label as IStyleFunctionOrObject<ILabelStyleProps, ILabelStyles>)
//       : undefined;

//     return label ? (
//       <Label
//         className={classNames.label}
//         id={state.labelId}
//         required={required}
//         styles={labelStyles}
//         disabled={disabled}
//       >
//         {label}
//       </Label>
//     ) : null;
//   };

//   /** Render Caret Down Icon */
//   const renderCaretDown = (): JSX.Element => {
//     return <Icon className={classNames.caretDown} iconName="ChevronDown" aria-hidden />;
//   };

//   const renderSeparator = (item: IDropdownOption): JSX.Element | null => {
//     const { index, key } = item;
//     if (index! > 0) {
//       return <div role="separator" key={key} className={classNames.dropdownDivider} />;
//     }
//     return null;
//   };

//   const renderOption = (item: IDropdownOption): JSX.Element => {
//     setSelectedIndices([]);
//     const isItemSelected =
//       item.index !== undefined && selectedIndices ? selectedIndices.indexOf(item.index) > -1 : false;

//     // select the right className based on the combination of selected/disabled
//     const itemClassName = item.hidden // predicate: item hidden
//       ? classNames.dropdownItemHidden
//       : isItemSelected && item.disabled === true // predicate: both selected and disabled
//       ? classNames.dropdownItemSelectedAndDisabled
//       : isItemSelected // predicate: selected only
//       ? classNames.dropdownItemSelected
//       : item.disabled === true // predicate: disabled only
//       ? classNames.dropdownItemDisabled
//       : classNames.dropdownItem;

//     const { title = item.text } = item;

//     const multiSelectItemStyles = classNames.subComponentStyles
//       ? (classNames.subComponentStyles.multiSelectItem as IStyleFunctionOrObject<ICheckboxStyleProps, ICheckboxStyles>)
//       : undefined;

//     return !props.multiSelect ? (
//       <CommandButton
//         id={state.listId + item.index}
//         key={item.key}
//         data-index={item.index}
//         data-is-focusable={!item.disabled}
//         disabled={item.disabled}
//         className={itemClassName}
//         onClick={onItemClick(item)}
//         onMouseEnter={onItemMouseEnter.bind(id, item)}
//         onMouseLeave={onMouseItemLeave.bind(id, item)}
//         onMouseMove={onItemMouseMove.bind(id, item)}
//         role="option"
//         aria-selected={isItemSelected ? 'true' : 'false'}
//         ariaLabel={item.ariaLabel}
//         title={title}
//         aria-posinset={state.sizePosCache.positionInSet(item.index)}
//         aria-setsize={state.sizePosCache.optionSetSize}
//       >
//         {onRenderOption(item, renderOption)}
//       </CommandButton>
//     ) : (
//       <Checkbox
//         id={state.listId + item.index}
//         key={item.key}
//         data-index={item.index}
//         data-is-focusable={!item.disabled}
//         disabled={item.disabled}
//         onChange={onItemClick(item)}
//         inputProps={{
//           onMouseEnter: onItemMouseEnter.bind(id, item),
//           onMouseLeave: onMouseItemLeave.bind(id, item),
//           onMouseMove: onItemMouseMove.bind(id, item),
//         }}
//         label={item.text}
//         title={title}
//         onRenderLabel={renderItemLabel.bind(id, item)}
//         className={itemClassName}
//         role="option"
//         aria-selected={isItemSelected ? 'true' : 'false'}
//         checked={isItemSelected}
//         styles={multiSelectItemStyles}
//         ariaPositionInSet={state.sizePosCache.positionInSet(item.index)}
//         ariaSetSize={state.sizePosCache.optionSetSize}
//       />
//     );
//   };

//   const renderHeader = (item: IDropdownOption): JSX.Element => {
//     const { onRenderOption } = props;
//     const { key } = item;
//     return (
//       <div id={id} key={key} className={classNames.dropdownItemHeader}>
//         {onRenderOption(item, onRenderOption)}
//       </div>
//     );
//   };

//   /** Render custom label for drop down item */
//   const renderItemLabel = (item: IDropdownOption): JSX.Element | null => {
//     const { onRenderOption } = props;
//     return onRenderOption(item, onRenderOption);
//   };

//   const onPositioned = (positions?: ICalloutPositionedInfo): void => {
//     if (focusZone.current) {
//       // Focusing an element can trigger a reflow. Making this wait until there is an animation
//       // frame can improve perf significantly.
//       requestAnimationFrame(() => {
//         const currentSelectedIndices = selectedIndices;
//         if (focusZone.current) {
//           if (
//             currentSelectedIndices &&
//             currentSelectedIndices[0] &&
//             !props.options[currentSelectedIndices[0]].disabled
//           ) {
//             const element: HTMLElement | null = getDocument()!.getElementById(`${id}-list${currentSelectedIndices[0]}`);
//             if (element) {
//               focusZone.current.focusElement(element);
//             }
//           } else {
//             focusZone.current.focus();
//           }
//         }
//       });
//     }
//     if (!calloutRenderEdge || calloutRenderEdge !== positions!.targetEdge) {
//       setCalloutRenderEdge(positions!.targetEdge);
//     }
//   };

//   const onItemClick = (item: IDropdownOption): ((event: React.MouseEvent<HTMLDivElement>) => void) => {
//     return (event: React.MouseEvent<HTMLDivElement>): void => {
//       if (!item.disabled) {
//         this.setSelectedIndex(event, item.index!);
//         if (!props.multiSelect) {
//           // only close the callout when it's in single-select mode
//           toggleIsOpen;
//         }
//       }
//     };
//   };

//   /**
//    * Scroll handler for the callout to make sure the mouse events
//    * for updating focus are not interacting during scroll
//    */
//   const onScroll = (): void => {
//     if (!state.isScrollIdle && state.scrollIdleTimeoutId !== undefined) {
//       clearTimeout(state.scrollIdleTimeoutId);
//       state.scrollIdleTimeoutId = undefined;
//     } else {
//       state.isScrollIdle = false;
//     }

//     state.scrollIdleTimeoutId = setTimeout(() => {
//       state.isScrollIdle = true;
//     }, state.scrollIdleDelay);
//   };

//   const onItemMouseEnter = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
//     if (shouldIgnoreMouseEvent()) {
//       return;
//     }

//     const targetElement = ev.currentTarget as HTMLElement;
//     targetElement.focus();
//   };

//   const onItemMouseMove = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
//     const targetElement = ev.currentTarget as HTMLElement;
//     state.gotMouseMove = true;

//     if (!state.isScrollIdle || document.activeElement === targetElement) {
//       return;
//     }

//     targetElement.focus();
//   };

//   const onMouseItemLeave = (item: any, ev: React.MouseEvent<HTMLElement>): void => {
//     if (shouldIgnoreMouseEvent()) {
//       return;
//     }

//     /**
//      * IE11 focus() method forces parents to scroll to top of element.
//      * Edge and IE expose a setActive() function for focusable divs that
//      * sets the page focus but does not scroll the parent element.
//      */
//     if (host.current) {
//       if ((host.current as any).setActive) {
//         try {
//           (host.current as any).setActive();
//         } catch (e) {
//           /* no-op */
//         }
//       } else {
//         host.current.focus();
//       }
//     }
//   };

//   const shouldIgnoreMouseEvent = (): boolean => {
//     return !state.isScrollIdle || !state.gotMouseMove;
//   };

//   const onDismiss = (): void => {
//     toggleIsOpen
//   };

//   /** Get all selected indexes for multi-select mode */
//   const getSelectedIndexes(
//     currentOptions: IDropdownOption[],
//     selectedKey: string | number | string[] | number[] | null | undefined,
//   ): number[] {
//     if (selectedKey === undefined) {
//       if (props.multiSelect) {
//         return getAllSelectedIndices(currentOptions);
//       }
//       const selectedIndex = getSelectedIndex(currentOptions, null);
//       return selectedIndex !== -1 ? [selectedIndex] : [];
//     } else if (!Array.isArray(selectedKey)) {
//       const selectedIndex = getSelectedIndex(currentOptions, selectedKey);
//       return selectedIndex !== -1 ? [selectedIndex] : [];
//     }
//     setSelectedIndices([])
//     for (const key of selectedKey) {
//       const selectedIndex = getSelectedIndex(currentOptions, key);
//       selectedIndex !== -1 && selectedIndices.push(selectedIndex);
//     }
//     return selectedIndices;
//   }

//   const getAllSelectedIndices = (currentOptions: IDropdownOption[]): number[] => {
//     return currentOptions
//       .map((option: IDropdownOption, index: number) => (option.selected ? index : -1))
//       .filter(index => index !== -1);
//   }

//   const getSelectedIndex = (currentOptions: IDropdownOption[], selectedKey: string | number | null): number => {
//     return findIndex(currentOptions, option => {
//       // tslint:disable-next-line:triple-equals
//       if (selectedKey != null) {
//         return option.key === selectedKey;
//       } else {
//         // tslint:disable-next-line:deprecation
//         return !!option.selected || !!option.isSelected;
//       }
//     });
//   }

//   const onDropdownBlur = (ev: React.FocusEvent<HTMLDivElement>): void => {
//     // If Dropdown disabled do not proceed with this logic.

//     if (disabled) {
//       return;
//     }

//     // hasFocus tracks whether the root element has focus so always update the state.
//     toggleHasFocus()

//     if (isOpen) {
//       // Do not onBlur when the callout is opened
//       return;
//     }
//     if (props.onBlur) {
//       props.onBlur(ev);
//     }
//   };

//   // const onDropdownKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>): void => {
//   //   // If Dropdown disabled do not process any keyboard events.
//   //   if (disabled) {
//   //     return;
//   //   }

//   //   // Take note if we are processing an alt (option) or meta (command) keydown.
//   //   // See comment in _shouldHandleKeyUp for reasoning.
//   //   state.lastKeyDownWasAltOrMeta = isAltOrMeta(ev);

//   //   if (props.onKeyDown) {
//   //     props.onKeyDown(ev);
//   //     if (ev.defaultPrevented) {
//   //       return;
//   //     }
//   //   }

//   //   let newIndex: number | undefined;
//   //   const selectedIndex = selectedIndices.length ? selectedIndices[0] : -1;
//   //   const containsExpandCollapseModifier = ev.altKey || ev.metaKey;

//   //   switch (ev.which) {
//   //     case KeyCodes.enter:
//   //       toggleIsOpen()
//   //       break;

//   //     case KeyCodes.escape:
//   //       if (!isOpen) {
//   //         return;
//   //       }
//   //       toggleIsOpen()
//   //       break;

//   //     case KeyCodes.up:
//   //       if (containsExpandCollapseModifier) {
//   //         if (isOpen) {
//   //           toggleIsOpen()
//   //           break;
//   //         }

//   //         return;
//   //       }
//   //       if (props.multiSelect) {
//   //         toggleIsOpen()
//   //       } else if (!isDisabled()) {
//   //         newIndex = moveIndex(ev, -1, selectedIndex - 1, selectedIndex);
//   //       }
//   //       break;

//   //     case KeyCodes.down:
//   //       if (containsExpandCollapseModifier) {
//   //         ev.stopPropagation();
//   //         ev.preventDefault();
//   //       }
//   //       if ((containsExpandCollapseModifier && !isOpen) || this.props.multiSelect) {
//   //          toggleIsOpen(()
//   //       } else if (!isDisabled()) {
//   //         newIndex = moveIndex(ev, 1, selectedIndex + 1, selectedIndex);
//   //       }
//   //       break;

//   //     case KeyCodes.home:
//   //       if (!props.multiSelect) {
//   //         newIndex = moveIndex(ev, 1, 0, selectedIndex);
//   //       }
//   //       break;

//   //     case KeyCodes.end:
//   //       if (!props.multiSelect) {
//   //         newIndex = moveIndex(ev, -1, props.options.length - 1, selectedIndex);
//   //       }
//   //       break;

//   //     case KeyCodes.space:
//   //       // event handled in _onDropdownKeyUp
//   //       break;

//   //     default:
//   //       return;
//   //   }

//   //   if (newIndex !== selectedIndex) {
//   //     ev.stopPropagation();
//   //     ev.preventDefault();
//   //   }
//   // };

//   const onDropdownKeyUp = (ev: React.KeyboardEvent<HTMLDivElement>): void => {
//     // If Dropdown disabled do not process any keyboard events.
//     if (disabled) {
//       return;
//     }

//     const shouldHandleKey = shouldHandleKeyUp(ev);
//     if (props.onKeyUp) {
//       props.onKeyUp(ev);
//       if (ev.defaultPrevented) {
//         return;
//       }
//     }
//     switch (ev.which) {
//       case KeyCodes.space:
//         toggleIsOpen()
//         break;

//       default:
//         if (shouldHandleKey && isOpen) {
//           toggleIsOpen()
//         }
//         return;
//     }

//     ev.stopPropagation();
//     ev.preventDefault();
//   };

//   /**
//    * Returns true if the key for the event is alt (Mac option) or meta (Mac command).
//    */
//   const isAltOrMeta = (ev: React.KeyboardEvent<HTMLElement>): boolean => {
//     return ev.which === KeyCodes.alt || ev.key === 'Meta';
//   }

//   /**
//    * We close the menu on key up only if ALL of the following are true:
//    * - Most recent key down was alt or meta (command)
//    * - The alt/meta key down was NOT followed by some other key (such as down/up arrow to
//    *   expand/collapse the menu)
//    * - We're not on a Mac (or iOS)
//    *
//    * This is because on Windows, pressing alt moves focus to the application menu bar or similar,
//    * closing any open context menus. There is not a similar behavior on Macs.
//    */
//   const shouldHandleKeyUp = (ev: React.KeyboardEvent<HTMLElement>): boolean => {
//     const keyPressIsAltOrMetaAlone = state.lastKeyDownWasAltOrMeta && isAltOrMeta(ev);
//     state.lastKeyDownWasAltOrMeta = false;
//     return !!keyPressIsAltOrMetaAlone && !(isMac() || isIOS());
//   }

//   const onZoneKeyDown = (ev: React.KeyboardEvent<HTMLElement>): void => {
//     let elementToFocus;

//     // Take note if we are processing an alt (option) or meta (command) keydown.
//     // See comment in _shouldHandleKeyUp for reasoning.
//     state.lastKeyDownWasAltOrMeta = isAltOrMeta(ev);
//     const containsExpandCollapseModifier = ev.altKey || ev.metaKey;

//     switch (ev.which) {
//       case KeyCodes.up:
//         if (containsExpandCollapseModifier) {
//           toggleIsOpen()
//         } else {
//           if (host.current) {
//             elementToFocus = getLastFocusable(host.current, host.current.lastChild as HTMLElement, true);
//           }
//         }
//         break;

//       // All directional keystrokes should be canceled when the zone is rendered.
//       // This avoids the body scroll from reacting and thus dismissing the dropdown.
//       case KeyCodes.home:
//       case KeyCodes.end:
//       case KeyCodes.pageUp:
//       case KeyCodes.pageDown:
//         break;

//       case KeyCodes.down:
//         if (!containsExpandCollapseModifier && host.current) {
//           elementToFocus = getFirstFocusable(host.current, host.current.firstChild as HTMLElement, true);
//         }
//         break;

//       case KeyCodes.escape:
//         toggleIsOpen()
//         break;

//       case KeyCodes.tab:
//        toggleIsOpen()
//         return;

//       default:
//         return;
//     }

//     if (elementToFocus) {
//       elementToFocus.focus();
//     }

//     ev.stopPropagation();
//     ev.preventDefault();
//   };

//   const onZoneKeyUp = (ev: React.KeyboardEvent<HTMLElement>): void => {
//     const shouldHandleKey = shouldHandleKeyUp(ev);

//     if (shouldHandleKey && isOpen) {
//       toggleIsOpen()
//       ev.preventDefault();
//     }
//   };

//   const _onDropdownClick = (ev: React.MouseEvent<HTMLDivElement>): void => {
//     if (props.onClick) {
//       props.onClick(ev);
//       if (ev.defaultPrevented) {
//         return;
//       }
//     }

//     if (!disabled && !shouldOpenOnFocus()) {
//       toggleIsOpen
//     }

//     state.isFocusedByClick = false; // reset
//   };

//   const onDropdownMouseDown = (): void => {
//     state.isFocusedByClick = true;
//   };

//   const onFocus = (ev: React.FocusEvent<HTMLDivElement>): void => {
//     if (!disabled) {
//       if (!isFocusedByClick && !isOpen && selectedIndices.length === 0 && !multiSelect) {
//         // Per aria: https://www.w3.org/TR/wai-aria-practices-1.1/#listbox_kbd_interaction
//         moveIndex(ev, 1, 0, -1);
//       }
//       if (props.onFocus) {
//         props.onFocus(ev);
//       }
//       const currentState: Pick<IDropdownState, 'hasFocus'> | Pick<IDropdownState, 'hasFocus' | 'isOpen'>
//       = { hasFocus: true };
//       if (shouldOpenOnFocus()) {
//         (currentState as Pick<IDropdownState, 'hasFocus' | 'isOpen'>).isOpen = true;
//       }

//       this.setState(state);
//     }
//   };

//   /** Render content of item (i.e. text/icon inside of button) */
//   const returnRenderOption = (item: IDropdownOption): JSX.Element => {
//     return <span className={classNames.dropdownOptionText}>{item.text}</span>;
//   };

//   const {
//     className,
//     label,
//     options,
//     ariaLabel,
//     required,
//     errorMessage,
//     keytipProps,
//     styles: propStyles,
//     theme,
//     panelProps,
//     calloutProps,
//     multiSelect,
//     onRenderTitle = renderTitle,
//     onRenderContainer = renderContainer,
//     onRenderCaretDown = renderCaretDown,
//     onRenderLabel = renderLabel,
//   } = props;

//   const onRenderPlaceholder = props.onRenderPlaceholder || props.onRenderPlaceHolder || onRenderPlaceholder;

//   const selectedOptions = getAllSelectedOptions(options, selectedIndices);
//   const divProps = getNativeProps(props, divProperties);

//   const disabled = isDisabled();

//   const errorMessageId = id + '-errorMessage';
//   const ariaActiveDescendant = disabled
//     ? undefined
//     : isOpen && selectedIndices.length === 1 && selectedIndices[0] >= 0
//     ? state.listId + selectedIndices[0]
//     : undefined;

//   const ariaAttrs = multiSelect
//     ? {
//         role: 'button',
//       }
//     : // single select
//       {
//         role: 'listbox',
//         childRole: 'option',
//         ariaSetSize: state.sizePosCache.optionSetSize,
//         ariaPosInSet: state.sizePosCache.positionInSet(selectedIndices[0]),
//         ariaSelected: selectedIndices[0] === undefined ? undefined : true,
//       };

//   const classNames = getClassNames(propStyles, {
//     theme,
//     className,
//     hasError: !!(errorMessage && errorMessage.length > 0),
//     hasLabel: !!label,
//     isOpen,
//     required,
//     disabled,
//     isRenderingPlaceholder: !selectedOptions.length,
//     panelClassName: !!panelProps ? panelProps.className : undefined,
//     calloutClassName: !!calloutProps ? calloutProps.className : undefined,
//     calloutRenderEdge: calloutRenderEdge,
//   });

//   const hasErrorMessage: boolean = !!errorMessage && errorMessage.length > 0;

//   const requestAnimationFrame = safeRequestAnimationFrame(id);

//   if (process.env.NODE_ENV !== 'production') {
//     warnDeprecations('Dropdown', props, {
//       isDisabled: 'disabled',
//       onChanged: 'onChange',
//       placeHolder: 'placeholder',
//       onRenderPlaceHolder: 'onRenderPlaceholder',
//     });

//     warnMutuallyExclusive('Dropdown', props, {
//       defaultSelectedKey: 'selectedKey',
//       defaultSelectedKeys: 'selectedKeys',
//       selectedKeys: 'selectedKey',
//     });

//     if (multiSelect) {
//       const warnMultiSelect = (prop: keyof IDropdownProps) =>
//         warn(`Dropdown property '${prop}' cannot be used when 'multiSelect' is true. Use '${prop}s' instead.`);
//       if (selectedKey !== undefined) {
//         warnMultiSelect('selectedKey');
//       }
//       if (defaultSelectedKey !== undefined) {
//         warnMultiSelect('defaultSelectedKey');
//       }
//     } else {
//       const warnNotMultiSelect = (prop: keyof IDropdownProps) =>
//         warn(`Dropdown property '${prop}s' cannot be used when 'multiSelect' is false/unset. Use '${prop}' instead.`);
//       if (selectedKeys !== undefined) {
//         warnNotMultiSelect('selectedKey');
//       }
//       if (defaultSelectedKeys !== undefined) {
//         warnNotMultiSelect('defaultSelectedKey');
//       }
//     }
//   }
//   if (multiSelect) {
//     state.selectedIndices = getSelectedIndexes(
//       options,
//       defaultSelectedKeys !== undefined ? defaultSelectedKeys : selectedKeys,
//     );
//   } else {
//     state.selectedIndices = getSelectedIndexes(
//       options,
//       (defaultSelectedKey !== undefined ? defaultSelectedKey : selectedKey)!,
//     );
//   }
//   state.sizePosCache.updateOptions(options);

//   return (
//     <div className={classNames.root}>
//       {onRenderLabel(props, onRenderLabel)}
//       <KeytipData keytipProps={keytipProps} disabled={disabled}>
//         {(keytipAttributes: any): JSX.Element => (
//           <div
//             {...keytipAttributes}
//             data-is-focusable={!disabled}
//             ref={dropDown}
//             id={id}
//             tabIndex={disabled ? -1 : 0}
//             role={ariaAttrs.role}
//             aria-haspopup="listbox"
//             aria-expanded={isOpen ? 'true' : 'false'}
//             aria-label={ariaLabel}
//             aria-labelledby={label && !ariaLabel ? mergeAriaAttributeValues(state.labelId, state.optionId) : undefined}
//             aria-describedby={mergeAriaAttributeValues(
//               keytipAttributes['aria-describedby'],
//               hasErrorMessage ? id + '-errorMessage' : undefined,
//             )}
//             aria-activedescendant={ariaActiveDescendant}
//             aria-required={required}
//             aria-disabled={disabled}
//             aria-owns={isOpen ? state.listId : undefined}
//             {...divProps}
//             className={classNames.dropdown}
//             onBlur={onDropdownBlur}
//             onKeyDown={onDropdownKeyDown}
//             onKeyUp={onDropdownKeyUp}
//             onClick={onDropdownClick}
//             onMouseDown={onDropdownMouseDown}
//             onFocus={onFocus}
//           >
//             <span
//               id={state.optionId}
//               className={classNames.title}
//               aria-live="polite"
//               aria-atomic
//               aria-invalid={hasErrorMessage}
//               role={ariaAttrs.childRole}
//               aria-setsize={ariaAttrs.ariaSetSize}
//               aria-posinset={ariaAttrs.ariaPosInSet}
//               aria-selected={ariaAttrs.ariaSelected}
//             >
//               {// If option is selected render title, otherwise render the placeholder text
//               selectedOptions.length
//                 ? onRenderTitle(selectedOptions, onRenderTitle)
//                 : onRenderPlaceholder(props, onRenderPlaceholder)}
//             </span>
//             <span className={classNames.caretDownWrapper}>{onRenderCaretDown(props, onRenderCaretDown)}</span>
//           </div>
//         )}
//       </KeytipData>
//       {isOpen && onRenderContainer({ ...props, onDismiss: onDismiss }, onRenderContainer)}
//       {hasErrorMessage && (
//         <div role="alert" id={errorMessageId} className={classNames.errorMessage}>
//           {errorMessage}
//         </div>
//       )}
//     </div>
//   );
// };
