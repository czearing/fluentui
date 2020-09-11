import { TestObject, IsConformantOptions } from './types';
import { ComponentDoc } from 'react-docgen-typescript';

import * as React from 'react';

import chalk from 'chalk';
import * as _ from 'lodash';
import * as renderer from 'react-test-renderer';

// import { mount } from 'enzyme';
// import { getComponent } from './utils/getComponent';
// import * as glob from 'glob';
// import * as path from 'path';

// import { create } from '@uifabric/utilities/lib/test';
// import * as mergeStylesSerializer from '@uifabric/jest-serializer-merge-styles';
import { resetIds } from 'office-ui-fabric-react/lib/Utilities';
/* eslint-disable @typescript-eslint/naming-convention */

export const defaultSnapshotTests: TestObject = {
  'component-matches-snapshot': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
    const { Component, requiredProps, displayName, snapshots } = testInfo;

    if (snapshots) {
      snapshots.forEach(() => {
        for (const snapshot of snapshots) {
          it(
            snapshot.name ||
              `renders ` + (snapshot?.componentName && ' ') + (snapshot?.description && ' ') + `correctly`,
            () => {
              try {
                resetIds();
                const tree = renderer.create(snapshot.render).toJSON();
                expect(tree).toMatchSnapshot();
              } catch (e) {
                console.log(
                  chalk.yellow(
                    `Snapshots tests for ` +
                      chalk.red.underline.bold(snapshot.name || snapshot.componentName || displayName) +
                      ` seem to not be rendering correctly.`,
                  ),
                );
                throw e;
              }
            },
          );
        }
      });
    } else {
      it(`renders correctly`, () => {
        try {
          resetIds();
          const tree = renderer.create(<Component {...requiredProps} />).toJSON();
          expect(tree).toMatchSnapshot();
        } catch (e) {
          console.error(
            chalk.yellow(
              `Snapshots tests for ` +
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

/** Component examples match snapshots */
// 'component-examples-match-snapshot': (componentInfo: ComponentDoc, testInfo: IsConformantOptions) => {
//   const snapshotsStateMap = new Map<string, ISnapshotState>();
//   const jestSnapshot = require('jest-snapshot');
//   const { componentPath, excludedExampleSnapshotTest } = testInfo;
//   const rootPath = componentPath.replace(/[\\/]src[\\/].*/, '');
//   const examplePaths: string[] = glob.sync(path.resolve(rootPath, 'src/components/**/examples/*Example*.tsx'));

//   jest-snapshot currently has no DefinitelyTyped or module defs so type the one object we care about for now here
//   interface ISnapshotState {
//     _updateSnapshot: string;
//     unmatched: number;
//     matched: number;
//     updated: number;
//     added: number;
//     getUncheckedCount(): number;
//     removeUncheckedKeys(): void;
//     save(): void;
//   }

//   jestSnapshot.addSerializer(mergeStylesSerializer);

//   expect.extend({
//     toMatchSpecificSnapshot(received, snapshotFile) {
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const globalSnapshotState: ISnapshotState = (this as any).snapshotState;

//       const absoluteSnapshotFile = rootPath + '/src/components/__snapshots__/' + snapshotFile + '.shot';
//       let snapshotState = snapshotsStateMap.get(absoluteSnapshotFile);
//       if (!snapshotState) {
//         snapshotState = new jestSnapshot.SnapshotState(absoluteSnapshotFile, {
//           snapshotPath: absoluteSnapshotFile,
//           updateSnapshot: globalSnapshotState._updateSnapshot,
//         });
//         snapshotsStateMap.set(absoluteSnapshotFile, snapshotState!);
//       }
//       const newThis = { ...this, snapshotState };
//       const patchedToMatchSnapshot = jestSnapshot.toMatchSnapshot.bind(newThis);
//       return patchedToMatchSnapshot(received);
//     },
//   });

//   for (const examplePath of examplePaths) {
//     const exampleFile = path.basename(examplePath);
//     if (excludedExampleSnapshotTest?.includes(exampleFile)) {
//       continue;
//     }

//     it(`renders ${exampleFile} correctly`, () => {
//       resetIds();

//       const exampleModule = require(examplePath);
//       const exampleExportNames = Object.keys(exampleModule);
//       const ComponentUnderTest: React.ComponentType = exampleModule[exampleExportNames[0]];
//       if (exampleExportNames.length > 1 || typeof ComponentUnderTest !== 'function') {
//         throw new Error(
//           'Examples should export exactly one React component, and nothing else.\n' +
//             `Found: ${exampleExportNames.map(exp => `${exp} (${typeof exampleModule[exp]})`).join(', ')}`,
//         );
//       }

//       const component = create(<ComponentUnderTest />);
//       const tree = component!.toJSON();

//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       (expect(tree) as any).toMatchSpecificSnapshot(exampleFile);
//     });
//   }
// },
