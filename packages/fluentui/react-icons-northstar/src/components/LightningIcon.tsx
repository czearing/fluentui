import * as React from 'react';
import cx from 'classnames';
import { createSvgIcon } from '../utils/createSvgIcon';
import { iconClassNames } from '../utils/iconClassNames';

export const LightningIcon = createSvgIcon({
  svg: ({ classes }) => (
    <svg role="presentation" focusable="false" viewBox="2 2 16 16" className={classes.svg}>
      <g>
        <path
          className={cx(iconClassNames.outline, classes.outlinePart)}
          d="M6.19152 2.77054C6.32183 2.31445 6.7387 2 7.21304 2H12.4621C13.1873 2 13.6993 2.71043 13.47 3.39836L13.4675 3.40584L13.4674 3.40582L12.2061 7H14.7698C15.7162 7 16.1772 8.1436 15.5363 8.81137L15.5328 8.81508L15.5328 8.81506L6.85624 17.6726C6.10187 18.4551 4.79709 17.7329 5.061 16.6773L6.23072 11.9984H4.96344C4.2576 11.9984 3.74801 11.3228 3.94191 10.6442L6.19152 2.77054ZM7.21304 3C7.18518 3 7.1607 3.01847 7.15304 3.04526L4.90344 10.9189C4.89205 10.9587 4.92198 10.9984 4.96344 10.9984H6.8711C7.02507 10.9984 7.17045 11.0694 7.26521 11.1907C7.35996 11.3121 7.39352 11.4703 7.35617 11.6197L6.03114 16.9198C6.02722 16.9355 6.02752 16.9448 6.02795 16.949C6.02839 16.9534 6.02942 16.9568 6.031 16.9601C6.03456 16.9676 6.04387 16.9798 6.06149 16.9896C6.07911 16.9993 6.09441 17.0007 6.10265 16.9997C6.1063 16.9993 6.10973 16.9984 6.11368 16.9964C6.11748 16.9945 6.12551 16.9898 6.1367 16.9782L6.14026 16.9745L6.14028 16.9745L14.8159 8.11787C14.828 8.10484 14.8313 8.09481 14.8326 8.0864C14.8343 8.07504 14.8332 8.05898 14.826 8.04178C14.8188 8.0246 14.8086 8.01365 14.8009 8.00817C14.7956 8.00438 14.7877 8 14.7698 8H11.5007C11.3386 8 11.1865 7.9214 11.0928 7.78915C10.999 7.65689 10.9752 7.48739 11.0289 7.33443L12.5219 3.08022C12.5338 3.04042 12.504 3 12.4621 3H7.21304Z"
        />
        <path
          className={cx(iconClassNames.filled, classes.filledPart)}
          d="M7.21304 2C6.7387 2 6.32183 2.31445 6.19152 2.77054L3.94191 10.6442C3.74801 11.3228 4.2576 11.9984 4.96344 11.9984H6.23072L5.061 16.6773C4.79709 17.7329 6.10187 18.4551 6.85624 17.6726L15.5328 8.81506L15.5363 8.81137C16.1772 8.1436 15.7162 7 14.7698 7H12.2061L13.4674 3.40582L13.47 3.39836C13.6993 2.71043 13.1873 2 12.4621 2H7.21304Z"
        />
      </g>
    </svg>
  ),
  displayName: 'LightningIcon',
});