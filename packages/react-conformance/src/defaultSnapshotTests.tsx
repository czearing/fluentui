import { TestObject, IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';

import * as React from 'react';

import chalk from 'chalk';
import * as _ from 'lodash';
import * as renderer from 'react-test-renderer';

import { resetIds } from 'office-ui-fabric-react/lib/Utilities';
/* eslint-disable @typescript-eslint/naming-convention */

export const defaultSnapshotTests: TestObject = {
  /** Component matches snapshot */
  'component-matches-snapshot': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
    const { Component, requiredProps, displayName, snapshots } = testInfo;
    if (snapshots) {
      for (const snapshot of snapshots) {
        const componentName: string | undefined = snapshot.componentName && snapshot.componentName + ' ';
        const description: string | undefined = snapshot.description && snapshot.description + ' ';
        const snapshotTest = () => {
          resetIds();
          const tree = renderer.create(snapshot.render).toJSON();
          expect(tree).toMatchSnapshot();
        };
        it(snapshot.name || `renders ` + (componentName || '') + (description || '') + `correctly`, () => {
          try {
            if (snapshot.createPortal) {
              const ReactDOM = require('react-dom');
              ReactDOM.createPortal = jest.fn(element => {
                return element;
              });
              snapshotTest();
              ReactDOM.createPortal.mockClear();
            } else {
              snapshotTest();
            }
          } catch (e) {
            console.log(
              chalk.yellow(
                `Snapshot tests for ` +
                  chalk.red.underline.bold(snapshot.name || snapshot.componentName || displayName) +
                  ` seem to not be rendering correctly.`,
              ),
            );
            throw e;
          }
        });
      }
    } else {
      it(`renders correctly`, () => {
        try {
          resetIds();
          const tree = renderer.create(<Component {...requiredProps} />).toJSON();
          expect(tree).toMatchSnapshot();
        } catch (e) {
          console.error(
            chalk.yellow(
              `Snapshot tests for ` +
                chalk.red.underline.bold(displayName) +
                ` seem to not be rendering correctly. See if you missing ` +
                chalk.white.bold(`requiredProps`) +
                ` or add custom ` +
                chalk.white.bold(`snapshots`) +
                ` inside ` +
                chalk.cyan.bold`isConformant.`,
            ),
          );
        }
      });
    }
  },
};
