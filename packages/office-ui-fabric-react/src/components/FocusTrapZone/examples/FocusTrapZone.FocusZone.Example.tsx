import * as React from 'react';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { FocusTrapZone } from 'office-ui-fabric-react/lib/FocusTrapZone';
import { FocusZone, FocusZoneDirection } from 'office-ui-fabric-react/lib/FocusZone';
import { Toggle, IToggle } from 'office-ui-fabric-react/lib/Toggle';
import { Stack, IStackTokens, IStackStyles } from 'office-ui-fabric-react/lib/Stack';
import { memoizeFunction } from 'office-ui-fabric-react/lib/Utilities';
import { useBoolean } from '@uifabric/react-hooks';

const tokens: IStackTokens = { childrenGap: 10 };

const getTrapZoneStackStyles = memoizeFunction(
  (useTrapZone: boolean): Partial<IStackStyles> => ({
    root: { border: `2px solid ${useTrapZone ? '#ababab' : 'transparent'}`, padding: 10 },
  }),
);

const focusZoneStackStyles: Partial<IStackStyles> = {
  root: {
    border: '2px dashed #ababab',
    padding: 10,
  },
};

const toggle = React.createRef<IToggle>();

export const FocusTrapZoneFocusZoneExample: React.FunctionComponent = () => {
  const [useTrapZone, { toggle: toggleUseTrapZone }] = useBoolean(false);
  return (
    <FocusTrapZone disabled={!useTrapZone} forceFocusInsideTrap focusPreviouslyFocusedInnerElement>
      <Stack tokens={tokens} horizontalAlign="start" styles={getTrapZoneStackStyles(useTrapZone)}>
        <Toggle
          label="Use trap zone"
          componentRef={toggle}
          checked={useTrapZone}
          onChange={toggleUseTrapZone}
          onText="On (toggle to exit)"
          offText="Off"
        />
        <FocusZone direction={FocusZoneDirection.horizontal} data-is-visible>
          <Stack horizontal tokens={tokens} styles={focusZoneStackStyles}>
            <DefaultButton text="FZ1" />
            <DefaultButton text="FZ1" />
            <DefaultButton text="FZ1" />
          </Stack>
        </FocusZone>

        <DefaultButton text="No FZ" />

        <FocusZone direction={FocusZoneDirection.horizontal} data-is-visible>
          <Stack horizontal tokens={tokens} styles={focusZoneStackStyles}>
            <DefaultButton text="FZ2" />
            <DefaultButton text="FZ2" />
            <DefaultButton text="FZ2" />
          </Stack>
        </FocusZone>
      </Stack>
    </FocusTrapZone>
  );
};
