import { getTranslatedSMS } from './utils/translationUtils.js';

const language = 'Oromic';
const templateKey = 'prescriptionDispensedNurse';

console.log(getTranslatedSMS(templateKey, {}, language));
