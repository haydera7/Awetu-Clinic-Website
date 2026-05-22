export const getTranslatedSMS = (templateKey, data, language = 'English') => {
  const translations = {
    paymentSuccess: {
      English: (d) => `HealthCare Pro: Your payment of ETB ${d.amount} via ${d.method} was successful. Thank you!`,
      Amharic: (d) => `HealthCare Pro: የ ETB ${d.amount} ክፍያዎ በ${d.method} ተሳክቷል። እናመሰግናለን!`,
      Oromic: (d) => `HealthCare Pro: Kaffaltiin keessan ETB ${d.amount} ${d.method} dhaan milkaa'eera. Galatoomaa!`
    },
    appointmentConfirmed: {
      English: (d) => `HealthCare Pro: Your appointment with ${d.doctor} is confirmed for ${d.time}.`,
      Amharic: (d) => `HealthCare Pro: ከ${d.doctor} ጋር ያሎት ቀጠሮ በ${d.time} ተረጋግጧል።`,
      Oromic: (d) => `HealthCare Pro: Beellamni keessan ${d.doctor} waliin ${d.time} mirkanaa'eera.`
    },
    labResultReady: {
      English: (d) => `HealthCare Pro: Your Lab Result (${d.title}) is now ready to view in your Patient Portal.`,
      Amharic: (d) => `HealthCare Pro: የላብራቶሪ ውጤትዎ (${d.title}) በታካሚ ፖርታልዎ ውስጥ ለማየት ዝግጁ ነው።`,
      Oromic: (d) => `HealthCare Pro: Bu'aan laaboraatorii keessan (${d.title}) portal dhukkubsataa keessan irratti ilaaluuf qophaa'eera.`
    },
    prescriptionSent: {
      English: (d) => `HealthCare Pro: Your doctor has sent a new prescription. Please wait at the pharmacy.`,
      Amharic: (d) => `HealthCare Pro: ዶክተርዎ አዲስ መድሀኒት ልከዋል። እባክዎ ፋርማሲ ውስጥ ይጠብቁ።`,
      Oromic: (d) => `HealthCare Pro: Doktoorri keessan qoricha haaraa erganiiru. Maaloo faarmaasiitti eegaa.`
    },
    prescriptionDispensedNurse: {
      English: (d) => `HealthCare Pro: Your prescription has been dispensed. Please proceed to the injection/treatment room for your procedure.`,
      Amharic: (d) => `HealthCare Pro: መድሀኒትዎ ተዘጋጅቷል። እባክዎ ለህክምናዎ ወደ መርፌ/ህክምና ክፍል ይሂዱ።`,
      Oromic: (d) => `HealthCare Pro: Qorichi keessan qophaa'eera. Maaloo yaala keessaniif kutaa lilmoo/yaalaa dhaqaa.`
    },
    prescriptionDispensedCheckout: {
      English: (d) => `HealthCare Pro: Your prescription has been dispensed. Please proceed to checkout.`,
      Amharic: (d) => `HealthCare Pro: መድሀኒትዎ ተዘጋጅቷል። እባክዎ ወደ ክፍያ ይሂዱ።`,
      Oromic: (d) => `HealthCare Pro: Qorichi keessan qophaa'eera. Maaloo gara kaffaltiitti darbaa.`
    }
  };

  const template = translations[templateKey];
  if (!template) return ''; 

  const formatter = template[language] || template['English'];
  return formatter(data || {});
};
