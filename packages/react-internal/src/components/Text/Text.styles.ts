import { ITextComponent, ITextStyles, ITextStyleProps, ITextStylesReturnType, ITextProps } from './Text.types';
import { ITheme } from '../../Styling';
import { getGlobalClassNames } from '../../Styling';

const GlobalClassNames = {
  root: 'ms-Text',
  ariaPlaceholder: 'ms-Text-aria-placeholder',
};

export const getStyles = (props: ITextStyleProps): ITextStyles => {
  const { className, theme } = props;
  const { fonts } = theme;
  const variantObject = fonts[variant || 'medium'];
  const classNames = getGlobalClassNames(GlobalClassNames, theme);

  return {
    root: [
      classNames.root,
      theme.fonts.medium,
      {
        display: block ? (as === 'td' ? 'table-cell' : 'block') : 'inline',
        fontFamily: variantObject.fontFamily,
        fontSize: variantObject.fontSize,
        fontWeight: variantObject.fontWeight,
        color: variantObject.color,
        mozOsxFontSmoothing: variantObject.MozOsxFontSmoothing,
        webkitFontSmoothing: variantObject.WebkitFontSmoothing,
      },
      nowrap && {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      className,
    ],
  };
};

//   return {
//     root: [
//       theme.fonts.medium,
//       {
//         display: block ? (as === 'td' ? 'table-cell' : 'block') : 'inline',
//         fontFamily: variantObject.fontFamily,
//         fontSize: variantObject.fontSize,
//         fontWeight: variantObject.fontWeight,
//         color: variantObject.color,
//         mozOsxFontSmoothing: variantObject.MozOsxFontSmoothing,
//         webkitFontSmoothing: variantObject.WebkitFontSmoothing,
//       },
//       nowrap && {
//         whiteSpace: 'nowrap',
//         overflow: 'hidden',
//         textOverflow: 'ellipsis',
//       },
//       className,
//     ],
//   } as ITextStyles;
// };

// import { ITooltipHostStyleProps, ITooltipHostStyles } from './TooltipHost.types';
// import { getGlobalClassNames } from '../../Styling';

// const GlobalClassNames = {
//   root: 'ms-TooltipHost',
//   ariaPlaceholder: 'ms-TooltipHost-aria-placeholder',
// };

// export const getStyles = (props: ITooltipHostStyleProps): ITooltipHostStyles => {
//   const { className, theme } = props;
//   const classNames = getGlobalClassNames(GlobalClassNames, theme);

//   return {
//     root: [
//       classNames.root,
//       {
//         display: 'inline',
//       },
//       className,
//     ],
//   };
// };
