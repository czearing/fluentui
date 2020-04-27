import * as React from 'react';
import { CommandBarButton } from 'office-ui-fabric-react/lib/Button';
import { ResizeGroup } from 'office-ui-fabric-react/lib/ResizeGroup';
import { OverflowSet, IOverflowSetStyles } from 'office-ui-fabric-react/lib/OverflowSet';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { IContextualMenuItem } from 'office-ui-fabric-react/lib/ContextualMenu';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { mergeStyleSets } from 'office-ui-fabric-react';
import { useBoolean } from '@uifabric/react-hooks';

const styles = mergeStyleSets({
  root: {
    display: 'block',
  },
  resizeIsShort: {
    width: '400px',
  },
  settingsGroup: {
    paddingTop: '20px',
  },
  itemCountDropdown: {
    width: '180px',
  },
});
const overflowSetStyles: Partial<IOverflowSetStyles> = { root: { height: 40 } };
const dropdownOptions = [
  { key: '20', text: '20' },
  { key: '30', text: '30' },
  { key: '40', text: '40' },
  { key: '50', text: '50' },
  { key: '75', text: '75' },
  { key: '100', text: '100' },
  { key: '200', text: '200' },
];
export interface IOverflowData {
  primary: IContextualMenuItem[];
  overflow: IContextualMenuItem[];
  cacheKey?: string;
}
const generateData = (count: number, cachingEnabled: boolean, checked: boolean): IOverflowData => {
  const icons = ['Add', 'Share', 'Upload'];
  const dataItems = [];
  let cacheKey = '';
  for (let index = 0; index < count; index++) {
    const item = {
      key: `item${index}`,
      name: `Item ${index}`,
      icon: icons[index % icons.length],
      checked: checked,
    };
    cacheKey = cacheKey + item.key;
    dataItems.push(item);
  }
  let result: IOverflowData = {
    primary: dataItems,
    overflow: [] as any[],
  };
  if (cachingEnabled) {
    result = { ...result, cacheKey };
  }
  return result;
};
const computeCacheKey = (primaryControls: IContextualMenuItem[]): string => {
  return primaryControls.reduce((acc, current) => acc + current.key, '');
};
const short = false;
const onRenderItem = (item: any) => (
  <CommandBarButton
    role="menuitem"
    text={item.name}
    iconProps={{ iconName: item.icon }}
    onClick={item.onClick}
    checked={item.checked}
  />
);

export const ResizeGroupOverflowSetExample: React.FunctionComponent = () => {
  const [numberOfItems, setNumberOfItems] = React.useState(20);
  const [buttonsChecked, { toggle: toggleButtonsChecked }] = useBoolean(false);
  const [cachingEnabled, { toggle: toggleCachingEnabled }] = useBoolean(false);
  const [onGrowDataEnabled, { toggle: toggleOnGrowDataEnabled }] = useBoolean(false);
  const dataToRender = generateData(numberOfItems, cachingEnabled, buttonsChecked);

  const onReduceData = (currentData: any): any => {
    if (currentData.primary.length === 0) {
      return undefined;
    }
    const overflow = [...currentData.primary.slice(-1), ...currentData.overflow];
    const primary = currentData.primary.slice(0, -1);
    let cacheKey = undefined;
    if (cachingEnabled) {
      cacheKey = computeCacheKey(primary);
    }
    return { primary, overflow, cacheKey };
  };
  const onGrowData = (currentData: any): any => {
    if (currentData.overflow.length === 0) {
      return undefined;
    }
    const overflow = currentData.overflow.slice(1);
    const primary = [...currentData.primary, ...currentData.overflow.slice(0, 1)];
    let cacheKey = undefined;
    if (cachingEnabled) {
      cacheKey = computeCacheKey(primary);
    }
    return { primary, overflow, cacheKey };
  };
  const onRenderOverflowButton = (overflowItems: any) => (
    <CommandBarButton role="menuitem" menuProps={{ items: overflowItems! }} />
  );
  const onRenderData = (data: any) => {
    return (
      <OverflowSet
        role="menubar"
        items={data.primary}
        overflowItems={data.overflow.length ? data.overflow : null}
        onRenderItem={onRenderItem}
        onRenderOverflowButton={onRenderOverflowButton}
        styles={overflowSetStyles}
      />
    );
  };
  const onNumberOfItemsChanged = (event: React.FormEvent<HTMLDivElement>, option: IDropdownOption): void => {
    setNumberOfItems(parseInt(option.text, 10));
  };
  return (
    <div className={short ? styles.resizeIsShort : 'notResized'}>
      <ResizeGroup
        role="tabpanel"
        aria-label="Resize Group with an Overflow Set"
        data={dataToRender}
        onReduceData={onReduceData}
        onGrowData={onGrowDataEnabled ? onGrowData : undefined}
        onRenderData={onRenderData}
      />
      <div className={styles.settingsGroup}>
        <Checkbox label="Enable caching" onChange={toggleCachingEnabled} checked={cachingEnabled} />
        <Checkbox label="Set onGrowData" onChange={toggleOnGrowDataEnabled} checked={onGrowDataEnabled} />
        <Checkbox label="Buttons checked" onChange={toggleButtonsChecked} checked={buttonsChecked} />
        <div className={styles.itemCountDropdown}>
          <Dropdown
            label="Number of items to render"
            selectedKey={numberOfItems.toString()}
            onChange={onNumberOfItemsChanged}
            options={dropdownOptions}
          />
        </div>
      </div>
    </div>
  );
};
