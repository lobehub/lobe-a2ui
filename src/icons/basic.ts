/** The basic catalog's icon names, drawn with the Lucide icon that means the same. */
export const BASIC_ICON_TO_LUCIDE: Record<string, string> = {
  accountCircle: 'circle-user-round',
  add: 'plus',
  arrowBack: 'arrow-left',
  arrowForward: 'arrow-right',
  attachFile: 'paperclip',
  calendarToday: 'calendar',
  call: 'phone-call',
  camera: 'camera',
  check: 'check',
  close: 'x',
  delete: 'trash-2',
  download: 'download',
  edit: 'pencil',
  error: 'circle-alert',
  event: 'calendar-days',
  fastForward: 'fast-forward',
  favorite: 'heart',
  favoriteOff: 'heart-off',
  folder: 'folder',
  help: 'circle-help',
  home: 'house',
  info: 'info',
  locationOn: 'map-pin',
  lock: 'lock',
  lockOpen: 'lock-open',
  mail: 'mail',
  menu: 'menu',
  moreHoriz: 'ellipsis',
  moreVert: 'ellipsis-vertical',
  notifications: 'bell',
  notificationsOff: 'bell-off',
  pause: 'pause',
  payment: 'credit-card',
  person: 'user-round',
  phone: 'phone',
  photo: 'image',
  play: 'play',
  print: 'printer',
  refresh: 'refresh-cw',
  rewind: 'rewind',
  search: 'search',
  send: 'send',
  settings: 'settings',
  share: 'share-2',
  shoppingCart: 'shopping-cart',
  skipNext: 'skip-forward',
  skipPrevious: 'skip-back',
  star: 'star',
  starHalf: 'star-half',
  starOff: 'star-off',
  stop: 'square',
  upload: 'upload',
  visibility: 'eye',
  visibilityOff: 'eye-off',
  volumeDown: 'volume-1',
  volumeMute: 'volume-x',
  volumeOff: 'volume-off',
  volumeUp: 'volume-2',
  warning: 'triangle-alert',
};

/** A Lucide name as Lucide writes it: kebab-case. */
export const normalizeLucideName = (name: string) =>
  name
    .trim()
    .replaceAll(/([a-z\d])([A-Z])/g, '$1-$2')
    .replaceAll(/[\s_]+/g, '-')
    .toLowerCase();

/** A Simple Icons slug: lowercase letters and digits. */
export const normalizeSimpleName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replaceAll(/[^\da-z]/g, '');
