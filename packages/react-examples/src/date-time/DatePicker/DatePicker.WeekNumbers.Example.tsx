import * as React from 'react';
import { Dropdown, IDropdownOption, mergeStyles } from '@fluentui/react';
import { DatePicker, DayOfWeek, defaultDayPickerStrings } from '@uifabric/date-time';

const days: IDropdownOption[] = [
  { text: 'Sunday', key: DayOfWeek.Sunday },
  { text: 'Monday', key: DayOfWeek.Monday },
  { text: 'Tuesday', key: DayOfWeek.Tuesday },
  { text: 'Wednesday', key: DayOfWeek.Wednesday },
  { text: 'Thursday', key: DayOfWeek.Thursday },
  { text: 'Friday', key: DayOfWeek.Friday },
  { text: 'Saturday', key: DayOfWeek.Saturday },
];
const rootClass = mergeStyles({ maxWidth: 300, selectors: { '> *': { marginBottom: 15 } } });

export const DatePickerWeekNumbersExample: React.FunctionComponent = () => {
  const [firstDayOfWeek, setFirstDayOfWeek] = React.useState(DayOfWeek.Sunday);

  const onDropdownChange = React.useCallback((event: React.FormEvent<HTMLDivElement>, option: IDropdownOption) => {
    setFirstDayOfWeek((DayOfWeek as any)[option.key]);
  }, []);

  return (
    <div className={rootClass}>
      <DatePicker
        firstDayOfWeek={firstDayOfWeek}
        strings={defaultDayPickerStrings}
        showWeekNumbers={true}
        firstWeekOfYear={1}
        showMonthPickerAsOverlay={true}
        placeholder="Select a date..."
        ariaLabel="Select a date"
      />
      <Dropdown
        label="Select the first day of the week"
        options={days}
        selectedKey={firstDayOfWeek}
        onChange={onDropdownChange}
      />
    </div>
  );
};
