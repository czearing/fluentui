import * as React from 'react';
import { Dropdown, DropdownMenuItemType, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';

const dropdownControlledExampleOptions = [
  { key: 'fruitsHeader', text: 'Fruits', itemType: DropdownMenuItemType.Header },
  { key: 'apple', text: 'Apple' },
  { key: 'banana', text: 'Banana' },
  { key: 'orange', text: 'Orange', disabled: true },
  { key: 'grape', text: 'Grape' },
  { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
  { key: 'vegetablesHeader', text: 'Vegetables', itemType: DropdownMenuItemType.Header },
  { key: 'broccoli', text: 'Broccoli' },
  { key: 'carrot', text: 'Carrot' },
  { key: 'lettuce', text: 'Lettuce' },
];

const dropdownStyles = { dropdown: { width: 300 } };
export const DropdownControlledExample: React.FC = () => {
  const [selectedItem, setSelectedItem] = React.useState();

  const onChange = (event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void => {
    setSelectedItem(item);
  };

  return (
    <Dropdown
      label="Controlled example"
      selectedKey={selectedItem ? selectedItem.key : undefined}
      onChange={onChange}
      placeholder="Select an option"
      options={dropdownControlledExampleOptions}
      styles={dropdownStyles}
    />
  );
};
