import { Button, Checkbox, Flexbox, Input, RadioGroup, Slider, Text, TextArea } from '@lobehub/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { define, styles } from './shared';

const Label = ({ children }: { children: ReactNode }) =>
  children ? <Text weight={500}>{children}</Text> : null;

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
  return (
    <Button
      disabled={props.isValid === false}
      // Secondary actions sit back as fill buttons, so the one primary action leads.
      type={primary ? 'primary' : props.variant === 'borderless' ? 'text' : 'fill'}
      onClick={() => (props.action as (() => void) | undefined)?.()}
    >
      {props.child ? buildChild(props.child) : null}
    </Button>
  );
});

export const TextFieldView = define('TextField', ({ props }) => {
  const value = props.value === undefined || props.value === null ? '' : String(props.value);
  const onChange = (next: string) => props.setValue?.(next);
  const placeholder = props.placeholder ? String(props.placeholder) : undefined;
  return (
    <Flexbox gap={6} style={{ minWidth: 0 }}>
      <Label>{props.label ? String(props.label) : null}</Label>
      {props.variant === 'longText' ? (
        <TextArea
          autoSize={{ maxRows: 6, minRows: 2 }}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          inputMode={props.variant === 'number' ? 'decimal' : undefined}
          placeholder={placeholder}
          value={value}
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
    <Checkbox checked={!!props.value} onChange={(checked) => props.setValue?.(!!checked)}>
      {String(props.label ?? '')}
    </Checkbox>
    <Errors errors={props.validationErrors} />
  </Flexbox>
));

type Option = { label: unknown; value: string };

/**
 * Checkboxes or radios by default, chips when asked; `filterable` adds a search box that narrows
 * the options by label, case-insensitively.
 */
export const ChoicePickerView = define('ChoicePicker', ({ props }) => {
  const [query, setQuery] = useState('');
  const selected = Array.isArray(props.value) ? (props.value as string[]) : [];
  const single = (props.variant ?? 'mutuallyExclusive') === 'mutuallyExclusive';
  const options = ((Array.isArray(props.options) ? props.options : []) as Option[]).filter(
    (option) => !query || String(option.label).toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (value: string) =>
    props.setValue?.(
      single
        ? [value]
        : selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
    );

  let choices: ReactNode;
  if (props.displayStyle === 'chips')
    choices = (
      <Flexbox horizontal gap={8} wrap="wrap">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <Button
              aria-pressed={on}
              key={option.value}
              shape="round"
              size="small"
              type={on ? 'primary' : 'fill'}
              onClick={() => toggle(option.value)}
            >
              {String(option.label)}
            </Button>
          );
        })}
      </Flexbox>
    );
  else if (single)
    choices = (
      <RadioGroup
        gap={8}
        horizontal={false}
        options={options.map((option) => ({ label: String(option.label), value: option.value }))}
        value={selected[0] ?? null}
        onChange={(value) => toggle(value)}
      />
    );
  else
    choices = (
      <Flexbox gap={8}>
        {options.map((option) => (
          <Checkbox
            checked={selected.includes(option.value)}
            key={option.value}
            onChange={() => toggle(option.value)}
          >
            {String(option.label)}
          </Checkbox>
        ))}
      </Flexbox>
    );

  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Label>{props.label ? String(props.label) : null}</Label>
      {props.filterable ? (
        <Input
          allowClear
          placeholder="Filter"
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
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
      <Flexbox horizontal justify="space-between">
        <Label>{props.label ? String(props.label) : null}</Label>
        <Text className={styles.figure} type="secondary">
          {Number(props.value ?? min).toLocaleString()}
        </Text>
      </Flexbox>
      <Slider
        max={max}
        min={min}
        step={step}
        value={Number(props.value ?? min)}
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
  return (
    <Flexbox gap={6} style={{ minWidth: 0 }}>
      <Label>{props.label ? String(props.label) : null}</Label>
      <Input
        max={props.max ? toInput(String(props.max), type) : undefined}
        min={props.min ? toInput(String(props.min), type) : undefined}
        type={type}
        value={toInput(String(props.value ?? ''), type)}
        onChange={(event) => props.setValue?.(fromInput(event.target.value, type))}
      />
      <Errors errors={props.validationErrors} />
    </Flexbox>
  );
});
