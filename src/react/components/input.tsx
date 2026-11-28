import {
  Button,
  ButtonGroup,
  Checkbox,
  ChipSelect,
  DatePicker,
  Flexbox,
  Input,
  RadioGroup,
  Slider,
  Text,
  TextArea,
} from '@lobehub/ui';
import { createContext, use, useState } from 'react';

import { useA2uiLabels } from '../host';
import { define } from './shared';

/** Set by a Form: its buttons sit at the end of the form, as the official submit row does. */
export const InFormContext = createContext(false);

/** A check's messages under the field it checks. */
const Errors = ({ errors }: { errors?: unknown }) =>
  Array.isArray(errors) && errors.length > 0 ? (
    <Flexbox gap={2}>
      {(errors as string[]).map((error) => (
        <Text fontSize={12} key={error} type="danger">
          {error}
        </Text>
      ))}
    </Flexbox>
  ) : null;

export const ButtonView = define('Button', ({ props, buildChild }) => {
  const primary = props.variant === 'primary';
  const inForm = use(InFormContext);
  return (
    <Button
      disabled={props.isValid === false}
      shape="round"
      style={{ alignSelf: inForm ? 'flex-end' : 'flex-start' }}
      // Secondary actions sit back as fill buttons, so the one primary action leads.
      type={primary ? 'primary' : props.variant === 'borderless' ? 'text' : 'fill'}
      onClick={() => (props.action as (() => void) | undefined)?.()}
    >
      {props.child ? buildChild(props.child) : null}
    </Button>
  );
});

const labelOf = (value: unknown) => (value ? String(value) : undefined);

export const TextFieldView = define('TextField', ({ props }) => {
  const value = props.value === undefined || props.value === null ? '' : String(props.value);
  const onChange = (next: string) => props.setValue?.(next);
  const placeholder = props.placeholder ? String(props.placeholder) : undefined;
  return (
    <Flexbox gap={6} style={{ minWidth: 0 }}>
      {props.variant === 'longText' ? (
        <TextArea
          autoSize={{ maxRows: 6, minRows: 2 }}
          label={labelOf(props.label)}
          placeholder={placeholder}
          value={value}
          variant="a2ui"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          inputMode={props.variant === 'number' ? 'decimal' : undefined}
          label={labelOf(props.label)}
          placeholder={placeholder}
          value={value}
          variant="a2ui"
          type={
            props.variant === 'obscured'
              ? 'password'
              : props.variant === 'number'
                ? 'number'
                : 'text'
          }
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <Errors errors={props.validationErrors} />
    </Flexbox>
  );
});

export const CheckBoxView = define('CheckBox', ({ props }) => (
  <Flexbox gap={4}>
    <Checkbox
      checked={!!props.value}
      variant="a2ui"
      onChange={(checked) => props.setValue?.(!!checked)}
    >
      {String(props.label ?? '')}
    </Checkbox>
    <Errors errors={props.validationErrors} />
  </Flexbox>
));

type Option = { label: unknown; value: string };

/**
 * One choice or several, drawn as the official playground draws them: chips (ChipSelect, or a
 * ButtonGroup for one), a radio list, or a checkbox list. `filterable` adds a search box that
 * narrows the options by label, case-insensitively.
 */
export const ChoicePickerView = define('ChoicePicker', ({ props }) => {
  const [query, setQuery] = useState('');
  const labels = useA2uiLabels();
  const selected = Array.isArray(props.value) ? (props.value as string[]) : [];
  const single = (props.variant ?? 'mutuallyExclusive') === 'mutuallyExclusive';
  const options = ((Array.isArray(props.options) ? props.options : []) as Option[])
    .filter((option) => !query || String(option.label).toLowerCase().includes(query.toLowerCase()))
    .map((option) => ({ label: String(option.label), value: option.value }));
  const label = labelOf(props.label);
  const chips = props.displayStyle === 'chips';

  const choices = single ? (
    chips ? (
      <ButtonGroup
        label={label}
        options={options}
        value={selected[0]}
        variant="a2ui"
        onChange={(value: string) => props.setValue?.([value])}
      />
    ) : (
      <RadioGroup
        label={label}
        options={options}
        value={selected[0]}
        variant="a2ui"
        onChange={(value: unknown) => props.setValue?.([String(value)])}
      />
    )
  ) : chips ? (
    <ChipSelect
      label={label}
      options={options}
      value={selected}
      variant="a2ui"
      onChange={(value: string[]) => props.setValue?.(value)}
    />
  ) : (
    <Flexbox gap={8}>
      {options.map((option) => (
        <Checkbox
          checked={selected.includes(option.value)}
          key={option.value}
          variant="a2ui"
          onChange={() =>
            props.setValue?.(
              selected.includes(option.value)
                ? selected.filter((item) => item !== option.value)
                : [...selected, option.value],
            )
          }
        >
          {option.label}
        </Checkbox>
      ))}
    </Flexbox>
  );

  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      {props.filterable ? (
        <Input
          allowClear
          placeholder={labels.filter}
          value={query}
          variant="a2ui"
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      {!single && !chips && label ? (
        <Text fontSize={13} weight={500}>
          {label}
        </Text>
      ) : null}
      {choices}
      <Errors errors={props.validationErrors} />
    </Flexbox>
  );
});

export const SliderView = define('Slider', ({ props }) => {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  // `steps` divides the range into that many steps; without it the value moves freely.
  const step = props.steps ? (max - min) / Number(props.steps) : (max - min) / 100;
  return (
    <Flexbox gap={4} style={{ minWidth: 0, width: '100%' }}>
      <Slider
        label={labelOf(props.label)}
        max={max}
        min={min}
        step={step}
        unit={props.unit ? String(props.unit) : undefined}
        value={Number(props.value ?? min)}
        variant="a2ui"
        onChange={(value) => props.setValue?.(Number(value))}
      />
      <Errors errors={props.validationErrors} />
    </Flexbox>
  );
});

const pad = (value: number) => String(value).padStart(2, '0');

/** An ISO 8601 value as the native input of the given type writes it, in local time. */
const toInput = (iso: string, type: 'date' | 'datetime-local' | 'time') => {
  if (!iso) return '';
  if (type === 'time' && /^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return type === 'date' ? iso.slice(0, 10) : '';
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return type === 'date' ? day : type === 'time' ? time : `${day}T${time}`;
};

/** The native input's value back as ISO 8601: a date, a time, or a full timestamp. */
const fromInput = (value: string, type: 'date' | 'datetime-local' | 'time') => {
  if (!value || type !== 'datetime-local') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

export const DateTimeInputView = define('DateTimeInput', ({ props }) => {
  const enableDate = props.enableDate ?? !props.enableTime;
  const type = enableDate && props.enableTime ? 'datetime-local' : enableDate ? 'date' : 'time';
  // A date alone opens the official calendar; times keep the native field in the same look.
  if (type === 'date')
    return (
      <Flexbox gap={6} style={{ minWidth: 0 }}>
        <DatePicker
          label={labelOf(props.label)}
          value={toInput(String(props.value ?? ''), 'date') as never}
          variant="a2ui"
          onChange={(_: unknown, iso: unknown) =>
            props.setValue?.(typeof iso === 'string' ? iso : '')
          }
        />
        <Errors errors={props.validationErrors} />
      </Flexbox>
    );
  return (
    <Flexbox gap={6} style={{ minWidth: 0 }}>
      <Input
        label={labelOf(props.label)}
        max={props.max ? toInput(String(props.max), type) : undefined}
        min={props.min ? toInput(String(props.min), type) : undefined}
        type={type}
        value={toInput(String(props.value ?? ''), type)}
        variant="a2ui"
        onChange={(event) => props.setValue?.(fromInput(event.target.value, type))}
      />
      <Errors errors={props.validationErrors} />
    </Flexbox>
  );
});
