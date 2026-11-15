import type { NasaKey } from '../data/nasa';

/** Which data entries back each fact card (for its source button). */
export const FACT_SOURCES: Record<string, NasaKey[]> = {
  dustStorm2018: ['dustStormTau2018', 'normalTauOpportunity'],
  lunarNight: ['moonSynodicDays'],
  speMars2024: ['marsSolarStorm2024'],
  speMoon: ['lunarSurfaceDose'],
  issWater: ['issWaterRecovery', 'issWaterRecoveryBeforeBPA'],
  co2: ['co2PerCrewDay'],
  moxie: ['moxiePeakRate', 'moxieDesignRate'],
  oxygen: ['oxygenPerCrewDay'],
  crops: ['cropPotatoEdibleFresh', 'cropLettuceEdibleFresh', 'potatoEnergy'],
  moonRadiation: ['lunarSurfaceDose', 'marsSurfaceDose'],
  marsRadiation: ['marsSurfaceDose', 'marsTransitDose'],
  maintenance: [],
  food: ['packagedFoodPerCrewDay', 'packagedFoodShelfLife'],
  doseLimit: ['careerDoseLimit'],
  marsSun: ['solarIrradianceMars', 'solarIrradianceMoon'],
  marsGravity: ['marsGravity'],
  moonSun: ['solarIrradianceMoon'],
  moonGravity: ['moonGravity'],
  kilopower: ['kilopowerOutput', 'kilopowerMass'],
};
