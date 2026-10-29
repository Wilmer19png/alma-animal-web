// Enlaces y textos de la tienda que usa el portal.
import { whatsapp as wa } from '../data/site';
import { GIFT } from '../data/shop';

export const whatsapp = (msg: string) => wa.shop(msg);
export const GIFT_TXT = GIFT.name;
