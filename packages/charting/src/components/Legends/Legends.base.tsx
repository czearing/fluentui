import * as React from 'react';

import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { HoverCard, HoverCardType, IExpandingCardProps } from '@fluentui/react/lib/HoverCard';
import { classNamesFunction, find, getNativeProps, buttonProperties } from '@fluentui/react/lib/Utilities';
import { ResizeGroup } from '@fluentui/react/lib/ResizeGroup';
import { IProcessedStyleSet } from '@fluentui/react/lib/Styling';
import { OverflowSet, IOverflowSetItemProps } from '@fluentui/react/lib/OverflowSet';
import { FocusZone, FocusZoneDirection } from '@fluentui/react-focus';
import {
  ILegend,
  ILegendsProps,
  LegendShape,
  ILegendsStyles,
  ILegendStyleProps,
  ILegendOverflowData,
} from './Legends.types';

import { silceOrAppendToArray } from '../../utilities/utilities';

const getClassNames = classNamesFunction<ILegendStyleProps, ILegendsStyles>();

// This is an internal interface used for rendering the legends with unique key
interface ILegendItem extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name?: string;
  title: string;
  action: VoidFunction;
  hoverAction: VoidFunction;
  onMouseOutAction: VoidFunction;
  color: string;
  shape?: LegendShape;
  key: number;
}

export interface ILegendState {
  selectedLegend: string;
  selectedLegendInHoverCard: string;
  selectedState: boolean;
  hoverState: boolean;
  isHoverCardVisible: boolean;
  selectedLegends: string[];
}
export class LegendsBase extends React.Component<ILegendsProps, ILegendState> {
  private _hoverCardRef: HTMLDivElement;
  private _classNames: IProcessedStyleSet<ILegendsStyles>;

  public constructor(props: ILegendsProps) {
    super(props);
    this.state = {
      selectedLegend: 'none',
      selectedState: false,
      hoverState: false,
      isHoverCardVisible: false,
      selectedLegendInHoverCard: 'none',
      selectedLegends: [],
    };
  }

  public componentDidUpdate(prevProps: ILegendsProps) {
    if (prevProps.selectedLegend !== this.props.selectedLegend) {
      this.setState({ selectedLegend: this.props.selectedLegend! });
    }
  }

  public render(): JSX.Element {
    const { theme, className, styles } = this.props;
    this._classNames = getClassNames(styles!, {
      theme: theme!,
      className,
    });
    const dataToRender = this._generateData();
    return (
      <div className={this._classNames.root}>
        {this.props.enabledWrapLines ? (
          this._onRenderData(dataToRender)
        ) : (
          <ResizeGroup
            data={dataToRender}
            onReduceData={this._onReduceData}
            onRenderData={this._onRenderData}
            onGrowData={this._onGrowData}
          />
        )}
      </div>
    );
  }

  private _generateData(): ILegendOverflowData {
    const { allowFocusOnLegends = true } = this.props;
    const dataItems: ILegendItem[] = this.props.legends.map((legend: ILegend, index: number) => {
      return {
        ...(allowFocusOnLegends && {
          nativeButtonProps: getNativeProps<React.HTMLAttributes<HTMLButtonElement>>(legend, buttonProperties, [
            'title',
          ]),
          'aria-setsize': this.props.legends.length,
          'aria-posinset': index + 1,
        }),
        title: legend.title,
        action: legend.action!,
        hoverAction: legend.hoverAction!,
        onMouseOutAction: legend.onMouseOutAction!,
        color: legend.color,
        shape: legend.shape,
        key: index,
      };
    });

    const result: ILegendOverflowData = {
      primary: dataItems,
      overflow: [],
    };
    return result;
  }

  private _onRenderData = (data: IOverflowSetItemProps | ILegendOverflowData): JSX.Element => {
    const { overflowProps, allowFocusOnLegends = true } = this.props;
    return (
      <OverflowSet
        {...(allowFocusOnLegends && { role: 'listbox' })}
        {...overflowProps}
        items={data.primary}
        overflowItems={data.overflow}
        onRenderItem={this._renderButton}
        onRenderOverflowButton={this._renderOverflowItems}
        styles={{
          root: {
            justifyContent: this.props.centerLegends ? 'center' : 'unset',
            flexWrap: 'wrap',
          },
        }}
      />
    );
  };

  private _onReduceData = (currentData: IOverflowSetItemProps): {} | void => {
    if (currentData.primary.length === 0) {
      return;
    }
    const overflow = [...currentData.primary.slice(-1), ...currentData.overflow];
    const primary = currentData.primary.slice(0, -1);
    return { primary, overflow };
  };

  private _onGrowData = (currentData: IOverflowSetItemProps): {} | void => {
    if (currentData.overflow.length === 0) {
      return;
    }
    const overflow = currentData.overflow.slice(1);
    const primary = [...currentData.primary, ...currentData.overflow.slice(0, 1)];
    return { primary, overflow };
  };

  /**
   * This function will get called when there is an ability to
   * select  multiple legends
   * @param legend ILegend
   */
  private _canSelectMultipleLegends = (legend: ILegend): void => {
    const selectedLegends = silceOrAppendToArray(this.state.selectedLegends, legend.title);
    this.setState({
      //check if user selected all legends then empty it get the default behavior
      selectedLegends: selectedLegends.length === this.props.legends.length ? [] : selectedLegends,
      // make selectedState to false if none or all the legends selected
      selectedState:
        selectedLegends.length === 0 || selectedLegends.length === this.props.legends.length ? false : true,
      selectedLegendInHoverCard: this.state.isHoverCardVisible ? legend.title : 'none',
      selectedLegend: 'none',
      hoverState: false,
    });
  };

  /**
   * This function will get called when there is
   * ability to select only single legend
   * @param legend ILegend
   */

  private _canSelectOnlySingleLegend = (legend: ILegend): void => {
    if (this.state.selectedState === true && this.state.selectedLegend === legend.title) {
      this.setState({
        selectedLegend: 'none',
        selectedState: false,
        selectedLegendInHoverCard: this.state.isHoverCardVisible ? legend.title : 'none',
      });
    } else {
      this.setState({
        selectedState: true,
        selectedLegend: legend.title,
        selectedLegendInHoverCard: this.state.isHoverCardVisible ? legend.title : 'none',
      });
    }
  };

  private _onClick = (legend: ILegend): void => {
    const { canSelectMultipleLegends = false } = this.props;
    if (canSelectMultipleLegends) {
      this._canSelectMultipleLegends(legend);
    } else {
      this._canSelectOnlySingleLegend(legend);
    }
    if (legend.action) {
      legend.action();
    }
  };

  private _onRenderCompactCard = (expandingCard: IExpandingCardProps): JSX.Element => {
    const { allowFocusOnLegends = true, className, styles, theme } = this.props;
    const overflowHoverCardLegends: JSX.Element[] = [];
    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
    });
    expandingCard.renderData.forEach((legend: IOverflowSetItemProps, index: number) => {
      const hoverCardElement = this._renderButton(legend, index, true);
      overflowHoverCardLegends.push(hoverCardElement);
    });
    const hoverCardData = (
      <FocusZone
        {...(allowFocusOnLegends && { role: 'listbox' })}
        direction={FocusZoneDirection.vertical}
        {...this.props.focusZonePropsInHoverCard}
        className={classNames.hoverCardRoot}
      >
        {overflowHoverCardLegends}
      </FocusZone>
    );
    return hoverCardData;
  };

  private _renderOverflowItems = (legends: ILegend[]) => {
    const { allowFocusOnLegends = true } = this.props;
    const items: IContextualMenuItem[] = [];
    legends.forEach((legend: ILegend, i: number) => {
      items.push({ key: i.toString(), name: legend.title, onClick: legend.action });
    });
    const renderOverflowData: IExpandingCardProps = { renderData: legends };
    const { theme, className, styles, overflowText } = this.props;
    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
    });
    const plainCardProps = {
      onRenderPlainCard: this._onRenderCompactCard,
      renderData: renderOverflowData,
    };

    const overflowString = overflowText ? overflowText : 'more';
    // execute similar to "_onClick" and "_onLeave" logic at HoverCard onCardHide event
    const onHoverCardHideHandler = () => {
      const { canSelectMultipleLegends = false } = this.props;
      const selectedOverflowItem = find(
        legends,
        (legend: ILegend) =>
          legend.title === this.state.selectedLegendInHoverCard || legend.title === this.state.selectedLegend,
      );
      this.setState(
        {
          isHoverCardVisible: false,
          selectedLegendInHoverCard: 'none',
          selectedLegends: [],
        },
        () => {
          if (selectedOverflowItem) {
            this.setState({ selectedLegend: 'none', selectedState: false }, () => {
              if (selectedOverflowItem.action && !canSelectMultipleLegends) {
                selectedOverflowItem.action();
              }
              if (this.props.onLegendHoverCardLeave && canSelectMultipleLegends) {
                this.props.onLegendHoverCardLeave();
              }
              this.setState({ hoverState: false }, () => {
                if (selectedOverflowItem.onMouseOutAction) {
                  selectedOverflowItem.onMouseOutAction(true);
                }
              });
            });
          }
        },
      );
    };
    return (
      <HoverCard
        type={HoverCardType.plain}
        plainCardProps={plainCardProps}
        instantOpenOnClick
        // eslint-disable-next-line react/jsx-no-bind
        onCardHide={onHoverCardHideHandler}
        setInitialFocus
        trapFocus
        onCardVisible={this._hoverCardVisible}
        styles={classNames.subComponentStyles.hoverCardStyles}
        cardDismissDelay={300}
        target={this._hoverCardRef}
      >
        <div
          className={classNames.overflowIndicationTextStyle}
          ref={(rootElem: HTMLDivElement) => (this._hoverCardRef = rootElem)}
          {...(allowFocusOnLegends && {
            'aria-expanded': this.state.isHoverCardVisible,
            'aria-label': `${items.length} ${overflowString}`,
          })}
          data-is-focusable={allowFocusOnLegends}
        >
          {items.length} {overflowString}
        </div>
      </HoverCard>
    );
  };

  private _hoverCardVisible = () => {
    this.setState({ isHoverCardVisible: true });
  };

  private _onHoverOverLegend = (legend: ILegend) => {
    if (!this.state.selectedState) {
      this.setState({ hoverState: true, selectedLegend: legend.title });
      if (legend.hoverAction) {
        legend.hoverAction();
      }
    }
  };

  private _onLeave = (legend: ILegend) => {
    if (!this.state.selectedState) {
      this.setState({ hoverState: false, selectedLegend: 'none' });
      if (legend.onMouseOutAction) {
        legend.onMouseOutAction();
      }
    }
  };

  private _renderButton = (data: IOverflowSetItemProps, index?: number, overflow?: boolean) => {
    const { allowFocusOnLegends = true } = this.props;
    const legend: ILegend = {
      title: data.title,
      color: data.color,
      shape: data.shape,
      action: data.action,
      hoverAction: data.hoverAction,
      onMouseOutAction: data.onMouseOutAction,
    };
    const color = this._getColor(legend.title, legend.color);
    const { theme, className, styles } = this.props;
    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
      colorOnSelectedState: color,
      borderColor: legend.color,
      overflow: overflow,
    });

    const onClickHandler = () => {
      this._onClick(legend);
    };
    const onHoverHandler = () => {
      this._onHoverOverLegend(legend);
    };
    const onMouseOut = () => {
      this._onLeave(legend);
    };
    return (
      <button
        {...(allowFocusOnLegends && {
          'aria-selected': this.state.selectedLegend === legend.title,
          role: 'option',
          'aria-label': legend.title,
          'aria-setsize': data['aria-setsize'],
          'aria-posinset': data['aria-posinset'],
        })}
        {...(data.nativeButtonProps && { ...data.nativeButtonProps })}
        key={index}
        className={classNames.legend}
        onClick={onClickHandler}
        onMouseOver={onHoverHandler}
        onMouseOut={onMouseOut}
        onFocus={onHoverHandler}
        onBlur={onMouseOut}
        data-is-focusable={allowFocusOnLegends}
      >
        <div className={this._getShapeClass(classNames, legend)} />
        <div className={classNames.text}>{legend.title}</div>
      </button>
    );
  };

  private _getShapeClass(classNames: IProcessedStyleSet<ILegendsStyles>, legend: ILegend): string {
    if (legend.shape === 'triangle') {
      return classNames.triangle;
    }

    return classNames.rect;
  }

  private _getColor(title: string, color: string): string {
    const { theme, canSelectMultipleLegends = false } = this.props;
    const { palette } = theme!;
    let legendColor = color;
    // below if statement  will get executed for the hovered legend.
    // (which is also the selected legend see function:-_onHoverOverLegend)
    if (this.state.hoverState && this.state.selectedLegend === title) {
      legendColor = color;
    } // below else if statement will get executed for  the  unselected-legend which is  hovered
    else if (this.state.hoverState && this.state.selectedLegend !== 'none' && this.state.selectedLegend !== title) {
      legendColor = palette.white;
    } // below else if statement will get executed if the legends are in the selected state
    // this is will only get executed  when we have ability to select multiple legends
    else if (!!canSelectMultipleLegends && this.state.selectedState && this.state.selectedLegends.indexOf(title) > -1) {
      legendColor = color;
    } // below else if statement will get executed when no legend is selected and hovered
    //(for example:- initial render of legends)
    else if (
      (!this.state.selectedState && this.state.selectedLegend === 'none') ||
      this.state.selectedLegend === title ||
      this.state.selectedLegends.length <= 0
    ) {
      legendColor = color;
    } else {
      legendColor = palette.white;
    }
    return legendColor;
  }
}
