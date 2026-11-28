import {
  ButtonGroup,
  Carousel,
  ChipSelect,
  Citation,
  Combobox,
  DatePicker,
  EntityCard,
  FollowUp,
  Image,
  List,
  Popover,
  RadioGroup,
  Segmented,
  Select,
  Skeleton,
  Switch,
  TextArea,
  Tooltip,
} from '@lobehub/ui';
import { createContext, type ReactNode, use } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiHost } from '../host';
import { useA2uiRecord } from '../record';
import { a2ui } from './a2ui';
import { useLucideIcon, useLucideResolver } from './icon';
import { InFormContext } from './input';
import { cell, childrenOf, define, rowsOf, safeUrl } from './shared';

/**
 * The official playground's lists, conversation helpers, inputs and overlays, drawn with the
 * `a2ui` variant of @lobehub/ui: official layout and type, LobeHub's colours. Inputs read their
 * value from the data model and write it back through the setter A2UI hands each bound prop.
 */

type Row = Record<string, unknown>;
const text = (value: unknown) =>
  value === undefined || value === null ? undefined : String(value);
const setterOf = (props: Record<string, unknown>, name = 'value') => {
  const setter = props[`set${name[0].toUpperCase()}${name.slice(1)}`];
  return typeof setter === 'function' ? (setter as (value: unknown) => void) : undefined;
};
const actionOf = (value: unknown) =>
  typeof value === 'function' ? (value as () => void) : undefined;

type Option = { description?: string; label: string; value: string };
const optionsOf = (value: unknown, max: number): Option[] =>
  (Array.isArray(value) ? value : []).slice(0, max).flatMap((option) => {
    if (typeof option === 'string' || typeof option === 'number')
      return [{ label: String(option), value: String(option) }];
    if (option && typeof option === 'object') {
      const o = option as Row;
      const v = text(o.value ?? o.label);
      return v === undefined
        ? []
        : [{ description: text(o.description), label: text(o.label) ?? v, value: v }];
    }
    return [];
  });

// --- Lists ---------------------------------------------------------------------------------------

/** What a List tells the ListItems it holds: its marker and connector, and each row's place. */
const ListContext = createContext<{
  connector?: 'none' | 'solid';
  index: number;
  marker?: 'bullet' | 'number' | 'rich' | 'none';
} | null>(null);

const MARKERS = new Set(['bullet', 'number', 'rich', 'none']);
const markerOf = (value: unknown) =>
  MARKERS.has(value as string) ? (value as 'bullet' | 'number' | 'rich' | 'none') : undefined;

type ListItemInput =
  string | { description?: unknown; icon?: unknown; label?: unknown; value?: unknown };

const ListRows = ({
  connector,
  direction,
  items,
  marker,
  onPick,
}: {
  connector?: 'none' | 'solid';
  direction?: 'vertical' | 'horizontal';
  items: ListItemInput[];
  marker?: 'bullet' | 'number' | 'rich' | 'none';
  onPick?: (index: number) => void;
}) => {
  const iconOf = useLucideResolver();
  const rows = items.map((item, index) =>
    typeof item === 'string'
      ? { key: index, label: item }
      : {
          description: text(item.description),
          icon: iconOf(item.icon),
          key: index,
          label: cell(item.label),
          value: text(item.value),
        },
  );
  const rich = items.some((item) => typeof item === 'object' && item?.icon);
  return (
    <List
      connector={connector}
      direction={direction}
      items={rows as never}
      marker={marker ?? (rich ? 'rich' : undefined)}
      variant="a2ui"
      onClick={onPick ? ({ key }: { key: unknown }) => onPick(Number(key)) : undefined}
    />
  );
};

export const ListView = define('List', ({ props, buildChild }) => {
  const marker = markerOf(props.marker);
  const connector = props.connector === 'solid' ? 'solid' : undefined;
  const direction = props.direction === 'horizontal' ? 'horizontal' : undefined;
  if (Array.isArray(props.items)) {
    const items = (props.items as ListItemInput[]).slice(0, A2UI_LIST_LIMITS.List.items);
    const pick = actionOf(props.action);
    return (
      <ListRows
        connector={connector}
        direction={direction}
        items={items}
        marker={marker}
        onPick={pick ? () => pick() : undefined}
      />
    );
  }
  // ListItem children: each draws its own row and learns its place from the list.
  const children = childrenOf(props.children, buildChild);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        // Rows of a rich list stand apart as the official ones do.
        gap: direction === 'horizontal' ? 8 : 10,
        minWidth: 0,
        overflowX: direction === 'horizontal' ? 'auto' : undefined,
      }}
    >
      {children.map((child, index) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- children keep their order
        <ListContext key={index} value={{ connector, index, marker }}>
          {child}
        </ListContext>
      ))}
    </div>
  );
});

export const ListItemView = define('ListItem', ({ props, buildChild }) => {
  const list = use(ListContext);
  const icon = useLucideIcon(typeof props.icon === 'string' ? props.icon : undefined);
  const pick = actionOf(props.action);
  const children = childrenOf(props.children, buildChild);
  const marker = list?.marker ?? (icon ? 'rich' : 'none');
  return (
    <List
      connector={list?.connector}
      marker={marker}
      start={(list?.index ?? 0) + 1}
      variant="a2ui"
      items={[
        {
          children: children.length > 0 ? children : undefined,
          description: text(props.description),
          disabled: props.disabled === true,
          icon,
          key: 0,
          label: cell(props.label),
          marker: text(props.marker),
          value: text(props.value),
        } as never,
      ]}
      onClick={pick ? () => pick() : undefined}
    />
  );
});

const BADGE_COLORS = new Set(['secondary', 'success', 'danger', 'warning', 'info', 'discovery']);

export const EntityCardView = define('EntityCard', ({ props }) => {
  const badge = props.badge && typeof props.badge === 'object' ? (props.badge as Row) : undefined;
  const actions = rowsOf<Row>(props.actions, A2UI_LIST_LIMITS.EntityCard.actions);
  const onAction = actionOf(props.onAction);
  const onClick = actionOf(props.onClick);
  const image = safeUrl(props.image);
  return (
    <EntityCard
      description={text(props.description)}
      href={safeUrl(props.href)}
      image={image}
      imageAspectRatio={text(props.imageAspectRatio)}
      layout={props.layout === 'horizontal' ? 'horizontal' : 'vertical'}
      meta={text(props.meta)}
      rating={typeof props.rating === 'number' ? props.rating : undefined}
      ratingCount={typeof props.ratingCount === 'number' ? props.ratingCount : undefined}
      subtitle={text(props.subtitle)}
      title={cell(props.title)}
      variant="a2ui"
      actions={
        actions.length > 0
          ? (actions.map((action) => ({
              href: safeUrl(action.href),
              label: cell(action.label),
              variant: text(action.variant),
            })) as never)
          : undefined
      }
      badge={
        badge
          ? ({
              color: BADGE_COLORS.has(badge.color as string) ? badge.color : 'secondary',
              label: cell(badge.label),
            } as never)
          : undefined
      }
      onAction={onAction ? () => onAction() : undefined}
      onClick={onClick ? () => onClick() : undefined}
    />
  );
});

// --- Conversation helpers ------------------------------------------------------------------------

/**
 * Suggested next prompts. A click sends the pill's message as the person's next turn: an action
 * whose readable line is the message itself, sent without closing the card. A card with its own
 * `onFollowUp` action runs that instead.
 */
export const FollowUpView = define('FollowUp', ({ props }) => {
  const host = useA2uiHost();
  const record = useA2uiRecord();
  const own = actionOf(props.onFollowUp);
  const items = (Array.isArray(props.items) ? props.items : [])
    .slice(0, A2UI_LIST_LIMITS.FollowUp.items)
    .map((item) =>
      item && typeof item === 'object'
        ? { label: cell((item as Row).label), message: text((item as Row).message) }
        : cell(item),
    );
  const canSend = !!own || (!!host?.canAct && !!record);
  return (
    <FollowUp
      items={items as never}
      title={text(props.title)}
      variant="a2ui"
      onFollowUp={
        canSend
          ? (message: string) => {
              if (own) return own();
              if (!host || !record) return;
              void host.sendAction(
                {
                  context: { message },
                  name: 'followUp',
                  surfaceId: record.surfaceId,
                  timestamp: new Date().toISOString(),
                  userMessage: message,
                },
                record,
              );
            }
          : undefined
      }
    />
  );
});

export const CitationView = define('Citation', ({ props }) => (
  <Citation
    index={typeof props.index === 'number' ? props.index : undefined}
    label={text(props.label)}
    snippet={text(props.snippet)}
    source={text(props.source)}
    title={text(props.title)}
    url={safeUrl(props.url)}
    variant="a2ui"
  />
));

// --- Inputs --------------------------------------------------------------------------------------

/** The official Form: its fields stacked 16px apart, each with its label above. */
export const FormView = define('Form', ({ props, buildChild }) => (
  <form
    className={a2ui.form}
    onSubmit={(event) => {
      event.preventDefault();
      actionOf(props.onSubmit)?.();
    }}
  >
    {props.label ? <div className={a2ui.fieldLabel}>{String(props.label)}</div> : null}
    <InFormContext value={true}>{childrenOf(props.children, buildChild)}</InFormContext>
  </form>
));

export const LabelView = define('Label', ({ props }) => (
  <label className={a2ui.fieldLabel} htmlFor={text(props.htmlFor)}>
    {String(props.text ?? '')}
  </label>
));

export const SelectView = define('Select', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <Select
      allowClear={props.clearable === true}
      disabled={props.disabled === true}
      label={text(props.label)}
      options={optionsOf(props.options, A2UI_LIST_LIMITS.Select.options)}
      placeholder={text(props.placeholder)}
      showSearch={props.searchable === true}
      style={{ width: '100%' }}
      value={text(props.value)}
      variant="a2ui"
      onChange={(value: unknown) => setValue?.(value)}
    />
  );
});

const OPTION_LOOKS = new Set(['list', 'pills', 'cards']);

export const RadioGroupView = define('RadioGroup', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <RadioGroup
      disabled={props.disabled === true}
      label={text(props.label)}
      options={optionsOf(props.options, A2UI_LIST_LIMITS.RadioGroup.options)}
      value={text(props.value)}
      variant="a2ui"
      optionVariant={
        OPTION_LOOKS.has(props.variant as string)
          ? (props.variant as 'list' | 'pills' | 'cards')
          : undefined
      }
      onChange={(value: unknown) =>
        setValue?.(
          typeof value === 'object' && value && 'target' in value
            ? (value as { target: { value: unknown } }).target.value
            : value,
        )
      }
    />
  );
});

/** A lone Radio: one option of a group the Agent drew piece by piece. */
export const RadioView = define('Radio', ({ props }) => {
  const setValue = setterOf(props);
  const value = text(props.value) ?? 'on';
  return (
    <RadioGroup
      disabled={props.disabled === true}
      options={[{ label: text(props.label) ?? value, value }]}
      value={props.value === true ? value : undefined}
      variant="a2ui"
      onChange={() => setValue?.(true)}
    />
  );
});

export const SegmentedControlView = define('SegmentedControl', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <Segmented
      block={props.block === true}
      disabled={props.disabled === true}
      label={text(props.label)}
      options={optionsOf(props.options, A2UI_LIST_LIMITS.SegmentedControl.options)}
      value={text(props.value)}
      variant="a2ui"
      onChange={(value: unknown) => setValue?.(value)}
    />
  );
});

export const TextAreaView = define('TextArea', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <TextArea
      disabled={props.disabled === true}
      label={text(props.label)}
      placeholder={text(props.placeholder)}
      value={text(props.value) ?? ''}
      variant="a2ui"
      autoSize={
        props.autoResize === false
          ? false
          : { maxRows: Number(props.maxRows) || 8, minRows: Number(props.rows) || 3 }
      }
      onChange={(event) => setValue?.(event.target.value)}
    />
  );
});

export const SwitchView = define('Switch', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <Switch
      checked={props.value === true}
      description={text(props.description)}
      label={text(props.label)}
      variant="a2ui"
      onChange={(checked: boolean) => setValue?.(checked)}
    />
  );
});

export const ChipSelectView = define('ChipSelect', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <ChipSelect
      label={text(props.label)}
      options={optionsOf(props.options, A2UI_LIST_LIMITS.ChipSelect.options)}
      value={(Array.isArray(props.value) ? props.value : []).map(String)}
      variant="a2ui"
      onChange={(value: string[]) => setValue?.(value)}
    />
  );
});

export const ButtonGroupView = define('ButtonGroup', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <ButtonGroup
      label={text(props.label)}
      options={optionsOf(props.options, 8)}
      value={text(props.value)}
      variant="a2ui"
      onChange={(value: string) => setValue?.(value)}
    />
  );
});

export const DatePickerView = define('DatePicker', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <DatePicker
      label={text(props.label)}
      placeholder={text(props.placeholder)}
      value={text(props.value) as never}
      variant="a2ui"
      onChange={(_: unknown, iso: unknown) => setValue?.(typeof iso === 'string' ? iso : undefined)}
    />
  );
});

export const ComboboxView = define('Combobox', ({ props }) => {
  const setValue = setterOf(props);
  return (
    <Combobox
      label={text(props.label)}
      options={optionsOf(props.options, A2UI_LIST_LIMITS.Combobox.options)}
      placeholder={text(props.placeholder)}
      value={text(props.value)}
      variant="a2ui"
      onChange={(value: string) => setValue?.(value)}
    />
  );
});

// --- Overlays, loading, carousel -----------------------------------------------------------------

export const TooltipView = define('Tooltip', ({ props, buildChild }) => (
  <Tooltip title={text(props.content)} variant="a2ui">
    <span style={{ display: 'inline-flex' }}>
      {typeof props.trigger === 'string' ? buildChild(props.trigger) : null}
    </span>
  </Tooltip>
));

/** A Popover's children are its PopoverTrigger and PopoverContent, in either order. */
const PopoverPart = createContext<'content' | 'trigger' | null>(null);

export const PopoverView = define('Popover', ({ props, buildChild }) => {
  const children = childrenOf(props.children, buildChild);
  const [trigger, content] = children;
  return (
    <Popover
      content={<PopoverPart value="content">{content}</PopoverPart>}
      trigger={props.showOnHover === true ? 'hover' : 'click'}
      variant="a2ui"
    >
      <span style={{ display: 'inline-flex' }}>
        <PopoverPart value="trigger">{trigger}</PopoverPart>
      </span>
    </Popover>
  );
});

export const PopoverTriggerView = define('PopoverTrigger', ({ props, buildChild }) => (
  <>{childrenOf(props.children, buildChild)}</>
));

export const PopoverContentView = define('PopoverContent', ({ props, buildChild }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: Number(props.width) || 280,
    }}
  >
    {childrenOf(props.children, buildChild)}
  </div>
));

export const SkeletonView = define('Skeleton', ({ props }) => (
  <Skeleton
    lines={Number(props.lines) || undefined}
    type={(['text', 'card', 'chart'] as const).find((type) => type === props.variant)}
    variant="a2ui"
  />
));

export const CarouselView = define('Carousel', ({ props, buildChild }) => (
  <Carousel
    arrows={props.showArrows !== false}
    defaultIndex={Number(props.activeIndex) || 0}
    snap={(['none', 'proximity', 'mandatory'] as const).find((snap) => snap === props.snap)}
    variant="a2ui"
  >
    {childrenOf(props.children, buildChild).slice(0, A2UI_LIST_LIMITS.Carousel.children)}
  </Carousel>
));

export const CarouselItemView = define('CarouselItem', ({ props, buildChild }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
    {childrenOf(props.children, buildChild)}
  </div>
));

export const CarouselMediaItemView = define(
  'CarouselMediaItem',
  ({ props, buildChild }): ReactNode => {
    const url = safeUrl(props.url);
    if (!url) return null;
    const href = safeUrl(props.href);
    const image = (
      <Image
        alt={text(props.description) ?? ''}
        preview={props.lightbox !== false && !href}
        src={url}
        style={{ borderRadius: 12, width: '100%' }}
      />
    );
    return (
      <figure style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, minWidth: 0 }}>
        {href ? (
          <a href={href} rel="noopener noreferrer" target="_blank">
            {image}
          </a>
        ) : (
          image
        )}
        {childrenOf(props.children, buildChild)}
      </figure>
    );
  },
);
