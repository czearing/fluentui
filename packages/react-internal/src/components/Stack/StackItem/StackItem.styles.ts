import { IStyle } from '../../../Styling';
import { IStackItemStyleProps, IStackItemStyles } from './StackItem.types';

const alignMap: { [key: string]: string } = {
  start: 'flex-start',
  end: 'flex-end',
};

export const getStyles = (props: IStackItemStyleProps): IStackItemStyles => {
  const { margin, padding, grow, shrink, disableShrink, align, verticalFill, order, className, theme } = props;

  return {
    root: [
      'ms-StackItem',
      theme.fonts.medium,
      {
        margin,
        padding,
        height: verticalFill ? '100%' : 'auto',
        width: 'auto',
      },
      grow && { flexGrow: grow === true ? 1 : grow },
      (disableShrink || (!grow && !shrink)) && {
        flexShrink: 0,
      },
      shrink &&
        !disableShrink && {
          flexShrink: 1,
        },
      align && {
        alignSelf: alignMap[align] || align,
      },
      order && {
        order: order,
      },
      className,
      // TODO: This cast may be hiding some potential issues with styling and name
      //       lookups and should be removed
    ] as IStyle,
  };
};
