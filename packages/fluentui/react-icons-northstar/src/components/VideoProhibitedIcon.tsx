import * as React from 'react';
import cx from 'classnames';
import { createSvgIcon } from '../utils/createSvgIcon';
import { iconClassNames } from '../utils/iconClassNames';

export const VideoProhibitedIcon = createSvgIcon({
  svg: ({ classes }) => (
    <svg role="presentation" focusable="false" viewBox="8 8 16 16" className={classes.svg}>
      <g className={cx(iconClassNames.outline, classes.outlinePart)}>
        <path d="M20.32,15.82A3.68,3.68,0,1,0,24,19.5,3.683,3.683,0,0,0,20.32,15.82Zm0,1a2.736,2.736,0,0,1,1.508.461L18.1,21.008A2.675,2.675,0,0,1,20.32,16.82Zm-.008,5.36a2.68,2.68,0,0,1-1.507-.461l3.726-3.727A2.648,2.648,0,0,1,23,19.5,2.681,2.681,0,0,1,20.312,22.18Z" />
        <path d="M18.879,11.926a1.59,1.59,0,0,0-.8-.8A1.378,1.378,0,0,0,17.5,11H9.82a1.221,1.221,0,0,0-.761.234,1.857,1.857,0,0,0-.512.614,3.39,3.39,0,0,0-.313.859,8.934,8.934,0,0,0-.164.961q-.054.48-.062.926c0,.3-.008.549-.008.758v1.3c0,.209,0,.461.008.758s.026.606.062.926a8.934,8.934,0,0,0,.164.961,3.39,3.39,0,0,0,.313.859,1.857,1.857,0,0,0,.512.614A1.221,1.221,0,0,0,9.82,21H15.9a5.034,5.034,0,0,1-.221-1H9.82a.4.4,0,0,1-.336-.219,2,2,0,0,1-.23-.554,5.558,5.558,0,0,1-.141-.747q-.051-.409-.078-.8T9,16.977c0-.209,0-.362,0-.461V15.477c0-.1,0-.253,0-.461s.013-.442.031-.7.044-.523.078-.8a5.528,5.528,0,0,1,.141-.747,1.987,1.987,0,0,1,.23-.554A.4.4,0,0,1,9.82,12H17.5a.505.505,0,0,1,.5.5v2.975a4.716,4.716,0,0,1,1-.442V12.5A1.378,1.378,0,0,0,18.879,11.926Z" />
        <path d="M23.852,12.148A.482.482,0,0,0,23.5,12a.469.469,0,0,0-.344.141l-2.531,2.414a2.02,2.02,0,0,0-.235.272,4.561,4.561,0,0,1,1.2.185L23,13.672v2.02a4.753,4.753,0,0,1,1,.952V12.5A.482.482,0,0,0,23.852,12.148Z" />
      </g>
      <g className={cx(iconClassNames.filled, classes.filledPart)}>
        <path d="M20.32,15.82A3.68,3.68,0,1,0,24,19.5,3.683,3.683,0,0,0,20.32,15.82Zm0,1a2.736,2.736,0,0,1,1.508.461L18.1,21.008A2.675,2.675,0,0,1,20.32,16.82Zm-.008,5.36a2.68,2.68,0,0,1-1.507-.461l3.726-3.727A2.648,2.648,0,0,1,23,19.5,2.681,2.681,0,0,1,20.312,22.18Z" />
        <path d="M15.633,19.5A4.671,4.671,0,0,1,19,15.033V12.5a1.378,1.378,0,0,0-.121-.574,1.59,1.59,0,0,0-.8-.8A1.378,1.378,0,0,0,17.5,11H9.82a1.221,1.221,0,0,0-.761.234,1.843,1.843,0,0,0-.512.618,3.462,3.462,0,0,0-.313.859,8.727,8.727,0,0,0-.164.961c-.036.323-.057.631-.062.926S8,15.143,8,15.352v1.3q0,.306.008.75t.062.93a8.727,8.727,0,0,0,.164.961,3.41,3.41,0,0,0,.313.856,1.9,1.9,0,0,0,.512.617A1.211,1.211,0,0,0,9.82,21H15.9A4.612,4.612,0,0,1,15.633,19.5Z" />
        <path d="M24,16.644V12.5a.505.505,0,0,0-.5-.5.469.469,0,0,0-.344.141l-2.531,2.414a2.018,2.018,0,0,0-.236.272A4.655,4.655,0,0,1,24,16.644Z" />
      </g>
    </svg>
  ),
  displayName: 'VideoProhibitedIcon',
});
