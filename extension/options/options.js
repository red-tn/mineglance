// MineGlance Options Page Script

const API_BASE = 'https://www.mineglance.com/api';

// Average electricity rates by state (USD/kWh) - 2024 data
const STATE_RATES = {
  'AL': 0.12, 'AK': 0.22, 'AZ': 0.12, 'AR': 0.10, 'CA': 0.23,
  'CO': 0.13, 'CT': 0.22, 'DE': 0.13, 'FL': 0.12, 'GA': 0.12,
  'HI': 0.33, 'ID': 0.10, 'IL': 0.13, 'IN': 0.13, 'IA': 0.12,
  'KS': 0.13, 'KY': 0.11, 'LA': 0.10, 'ME': 0.18, 'MD': 0.14,
  'MA': 0.23, 'MI': 0.16, 'MN': 0.13, 'MS': 0.11, 'MO': 0.12,
  'MT': 0.11, 'NE': 0.11, 'NV': 0.12, 'NH': 0.20, 'NJ': 0.16,
  'NM': 0.13, 'NY': 0.19, 'NC': 0.11, 'ND': 0.10, 'OH': 0.12,
  'OK': 0.11, 'OR': 0.11, 'PA': 0.14, 'RI': 0.22, 'SC': 0.13,
  'SD': 0.12, 'TN': 0.11, 'TX': 0.12, 'UT': 0.10, 'VT': 0.18,
  'VA': 0.12, 'WA': 0.10, 'WV': 0.12, 'WI': 0.14, 'WY': 0.11,
  'DC': 0.13
};

// ZIP code to state mapping (first 3 digits)
const ZIP_TO_STATE = {
  '005': 'NY', '006': 'PR', '007': 'PR', '008': 'VI', '009': 'PR',
  '010': 'MA', '011': 'MA', '012': 'MA', '013': 'MA', '014': 'MA',
  '015': 'MA', '016': 'MA', '017': 'MA', '018': 'MA', '019': 'MA',
  '020': 'MA', '021': 'MA', '022': 'MA', '023': 'MA', '024': 'MA',
  '025': 'MA', '026': 'MA', '027': 'MA', '028': 'RI', '029': 'RI',
  '030': 'NH', '031': 'NH', '032': 'NH', '033': 'NH', '034': 'NH',
  '035': 'NH', '036': 'NH', '037': 'NH', '038': 'NH', '039': 'ME',
  '040': 'ME', '041': 'ME', '042': 'ME', '043': 'ME', '044': 'ME',
  '045': 'ME', '046': 'ME', '047': 'ME', '048': 'ME', '049': 'ME',
  '050': 'VT', '051': 'VT', '052': 'VT', '053': 'VT', '054': 'VT',
  '055': 'MA', '056': 'VT', '057': 'VT', '058': 'VT', '059': 'VT',
  '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT',
  '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
  '070': 'NJ', '071': 'NJ', '072': 'NJ', '073': 'NJ', '074': 'NJ',
  '075': 'NJ', '076': 'NJ', '077': 'NJ', '078': 'NJ', '079': 'NJ',
  '080': 'NJ', '081': 'NJ', '082': 'NJ', '083': 'NJ', '084': 'NJ',
  '085': 'NJ', '086': 'NJ', '087': 'NJ', '088': 'NJ', '089': 'NJ',
  '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY',
  '105': 'NY', '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY',
  '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY',
  '115': 'NY', '116': 'NY', '117': 'NY', '118': 'NY', '119': 'NY',
  '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY', '124': 'NY',
  '125': 'NY', '126': 'NY', '127': 'NY', '128': 'NY', '129': 'NY',
  '130': 'NY', '131': 'NY', '132': 'NY', '133': 'NY', '134': 'NY',
  '135': 'NY', '136': 'NY', '137': 'NY', '138': 'NY', '139': 'NY',
  '140': 'NY', '141': 'NY', '142': 'NY', '143': 'NY', '144': 'NY',
  '145': 'NY', '146': 'NY', '147': 'NY', '148': 'NY', '149': 'NY',
  '150': 'PA', '151': 'PA', '152': 'PA', '153': 'PA', '154': 'PA',
  '155': 'PA', '156': 'PA', '157': 'PA', '158': 'PA', '159': 'PA',
  '160': 'PA', '161': 'PA', '162': 'PA', '163': 'PA', '164': 'PA',
  '165': 'PA', '166': 'PA', '167': 'PA', '168': 'PA', '169': 'PA',
  '170': 'PA', '171': 'PA', '172': 'PA', '173': 'PA', '174': 'PA',
  '175': 'PA', '176': 'PA', '177': 'PA', '178': 'PA', '179': 'PA',
  '180': 'PA', '181': 'PA', '182': 'PA', '183': 'PA', '184': 'PA',
  '185': 'PA', '186': 'PA', '187': 'PA', '188': 'PA', '189': 'PA',
  '190': 'PA', '191': 'PA', '192': 'PA', '193': 'PA', '194': 'PA',
  '195': 'PA', '196': 'PA',
  '197': 'DE', '198': 'DE', '199': 'DE',
  '200': 'DC', '201': 'VA', '202': 'DC', '203': 'DC', '204': 'DC',
  '205': 'DC', '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD',
  '210': 'MD', '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD',
  '216': 'MD', '217': 'MD', '218': 'MD', '219': 'MD',
  '220': 'VA', '221': 'VA', '222': 'VA', '223': 'VA', '224': 'VA',
  '225': 'VA', '226': 'VA', '227': 'VA', '228': 'VA', '229': 'VA',
  '230': 'VA', '231': 'VA', '232': 'VA', '233': 'VA', '234': 'VA',
  '235': 'VA', '236': 'VA', '237': 'VA', '238': 'VA', '239': 'VA',
  '240': 'VA', '241': 'VA', '242': 'VA', '243': 'VA', '244': 'VA',
  '245': 'VA', '246': 'VA',
  '247': 'WV', '248': 'WV', '249': 'WV', '250': 'WV', '251': 'WV',
  '252': 'WV', '253': 'WV', '254': 'WV', '255': 'WV', '256': 'WV',
  '257': 'WV', '258': 'WV', '259': 'WV', '260': 'WV', '261': 'WV',
  '262': 'WV', '263': 'WV', '264': 'WV', '265': 'WV', '266': 'WV',
  '267': 'WV', '268': 'WV',
  '270': 'NC', '271': 'NC', '272': 'NC', '273': 'NC', '274': 'NC',
  '275': 'NC', '276': 'NC', '277': 'NC', '278': 'NC', '279': 'NC',
  '280': 'NC', '281': 'NC', '282': 'NC', '283': 'NC', '284': 'NC',
  '285': 'NC', '286': 'NC', '287': 'NC', '288': 'NC', '289': 'NC',
  '290': 'SC', '291': 'SC', '292': 'SC', '293': 'SC', '294': 'SC',
  '295': 'SC', '296': 'SC', '297': 'SC', '298': 'SC', '299': 'SC',
  '300': 'GA', '301': 'GA', '302': 'GA', '303': 'GA', '304': 'GA',
  '305': 'GA', '306': 'GA', '307': 'GA', '308': 'GA', '309': 'GA',
  '310': 'GA', '311': 'GA', '312': 'GA', '313': 'GA', '314': 'GA',
  '315': 'GA', '316': 'GA', '317': 'GA', '318': 'GA', '319': 'GA',
  '320': 'FL', '321': 'FL', '322': 'FL', '323': 'FL', '324': 'FL',
  '325': 'FL', '326': 'FL', '327': 'FL', '328': 'FL', '329': 'FL',
  '330': 'FL', '331': 'FL', '332': 'FL', '333': 'FL', '334': 'FL',
  '335': 'FL', '336': 'FL', '337': 'FL', '338': 'FL', '339': 'FL',
  '340': 'FL', '341': 'FL', '342': 'FL', '344': 'FL', '346': 'FL',
  '347': 'FL', '349': 'FL',
  '350': 'AL', '351': 'AL', '352': 'AL', '354': 'AL', '355': 'AL',
  '356': 'AL', '357': 'AL', '358': 'AL', '359': 'AL', '360': 'AL',
  '361': 'AL', '362': 'AL', '363': 'AL', '364': 'AL', '365': 'AL',
  '366': 'AL', '367': 'AL', '368': 'AL', '369': 'AL',
  '370': 'TN', '371': 'TN', '372': 'TN', '373': 'TN', '374': 'TN',
  '375': 'TN', '376': 'TN', '377': 'TN', '378': 'TN', '379': 'TN',
  '380': 'TN', '381': 'TN', '382': 'TN', '383': 'TN', '384': 'TN',
  '385': 'TN',
  '386': 'MS', '387': 'MS', '388': 'MS', '389': 'MS', '390': 'MS',
  '391': 'MS', '392': 'MS', '393': 'MS', '394': 'MS', '395': 'MS',
  '396': 'MS', '397': 'MS',
  '400': 'KY', '401': 'KY', '402': 'KY', '403': 'KY', '404': 'KY',
  '405': 'KY', '406': 'KY', '407': 'KY', '408': 'KY', '409': 'KY',
  '410': 'KY', '411': 'KY', '412': 'KY', '413': 'KY', '414': 'KY',
  '415': 'KY', '416': 'KY', '417': 'KY', '418': 'KY',
  '420': 'KY', '421': 'KY', '422': 'KY', '423': 'KY', '424': 'KY',
  '425': 'KY', '426': 'KY', '427': 'KY',
  '430': 'OH', '431': 'OH', '432': 'OH', '433': 'OH', '434': 'OH',
  '435': 'OH', '436': 'OH', '437': 'OH', '438': 'OH', '439': 'OH',
  '440': 'OH', '441': 'OH', '442': 'OH', '443': 'OH', '444': 'OH',
  '445': 'OH', '446': 'OH', '447': 'OH', '448': 'OH', '449': 'OH',
  '450': 'OH', '451': 'OH', '452': 'OH', '453': 'OH', '454': 'OH',
  '455': 'OH', '456': 'OH', '457': 'OH', '458': 'OH', '459': 'OH',
  '460': 'IN', '461': 'IN', '462': 'IN', '463': 'IN', '464': 'IN',
  '465': 'IN', '466': 'IN', '467': 'IN', '468': 'IN', '469': 'IN',
  '470': 'IN', '471': 'IN', '472': 'IN', '473': 'IN', '474': 'IN',
  '475': 'IN', '476': 'IN', '477': 'IN', '478': 'IN', '479': 'IN',
  '480': 'MI', '481': 'MI', '482': 'MI', '483': 'MI', '484': 'MI',
  '485': 'MI', '486': 'MI', '487': 'MI', '488': 'MI', '489': 'MI',
  '490': 'MI', '491': 'MI', '492': 'MI', '493': 'MI', '494': 'MI',
  '495': 'MI', '496': 'MI', '497': 'MI', '498': 'MI', '499': 'MI',
  '500': 'IA', '501': 'IA', '502': 'IA', '503': 'IA', '504': 'IA',
  '505': 'IA', '506': 'IA', '507': 'IA', '508': 'IA', '509': 'IA',
  '510': 'IA', '511': 'IA', '512': 'IA', '513': 'IA', '514': 'IA',
  '515': 'IA', '516': 'IA', '520': 'IA', '521': 'IA', '522': 'IA',
  '523': 'IA', '524': 'IA', '525': 'IA', '526': 'IA', '527': 'IA',
  '528': 'IA',
  '530': 'WI', '531': 'WI', '532': 'WI', '534': 'WI', '535': 'WI',
  '537': 'WI', '538': 'WI', '539': 'WI', '540': 'WI', '541': 'WI',
  '542': 'WI', '543': 'WI', '544': 'WI', '545': 'WI', '546': 'WI',
  '547': 'WI', '548': 'WI', '549': 'WI',
  '550': 'MN', '551': 'MN', '553': 'MN', '554': 'MN', '555': 'MN',
  '556': 'MN', '557': 'MN', '558': 'MN', '559': 'MN', '560': 'MN',
  '561': 'MN', '562': 'MN', '563': 'MN', '564': 'MN', '565': 'MN',
  '566': 'MN', '567': 'MN',
  '570': 'SD', '571': 'SD', '572': 'SD', '573': 'SD', '574': 'SD',
  '575': 'SD', '576': 'SD', '577': 'SD',
  '580': 'ND', '581': 'ND', '582': 'ND', '583': 'ND', '584': 'ND',
  '585': 'ND', '586': 'ND', '587': 'ND', '588': 'ND',
  '590': 'MT', '591': 'MT', '592': 'MT', '593': 'MT', '594': 'MT',
  '595': 'MT', '596': 'MT', '597': 'MT', '598': 'MT', '599': 'MT',
  '600': 'IL', '601': 'IL', '602': 'IL', '603': 'IL', '604': 'IL',
  '605': 'IL', '606': 'IL', '607': 'IL', '608': 'IL', '609': 'IL',
  '610': 'IL', '611': 'IL', '612': 'IL', '613': 'IL', '614': 'IL',
  '615': 'IL', '616': 'IL', '617': 'IL', '618': 'IL', '619': 'IL',
  '620': 'IL', '622': 'IL', '623': 'IL', '624': 'IL', '625': 'IL',
  '626': 'IL', '627': 'IL', '628': 'IL', '629': 'IL',
  '630': 'MO', '631': 'MO', '633': 'MO', '634': 'MO', '635': 'MO',
  '636': 'MO', '637': 'MO', '638': 'MO', '639': 'MO', '640': 'MO',
  '641': 'MO', '644': 'MO', '645': 'MO', '646': 'MO', '647': 'MO',
  '648': 'MO', '649': 'MO', '650': 'MO', '651': 'MO', '652': 'MO',
  '653': 'MO', '654': 'MO', '655': 'MO', '656': 'MO', '657': 'MO',
  '658': 'MO',
  '660': 'KS', '661': 'KS', '662': 'KS', '664': 'KS', '665': 'KS',
  '666': 'KS', '667': 'KS', '668': 'KS', '669': 'KS', '670': 'KS',
  '671': 'KS', '672': 'KS', '673': 'KS', '674': 'KS', '675': 'KS',
  '676': 'KS', '677': 'KS', '678': 'KS', '679': 'KS',
  '680': 'NE', '681': 'NE', '683': 'NE', '684': 'NE', '685': 'NE',
  '686': 'NE', '687': 'NE', '688': 'NE', '689': 'NE', '690': 'NE',
  '691': 'NE', '692': 'NE', '693': 'NE',
  '700': 'LA', '701': 'LA', '703': 'LA', '704': 'LA', '705': 'LA',
  '706': 'LA', '707': 'LA', '708': 'LA', '710': 'LA', '711': 'LA',
  '712': 'LA', '713': 'LA', '714': 'LA',
  '716': 'AR', '717': 'AR', '718': 'AR', '719': 'AR', '720': 'AR',
  '721': 'AR', '722': 'AR', '723': 'AR', '724': 'AR', '725': 'AR',
  '726': 'AR', '727': 'AR', '728': 'AR', '729': 'AR',
  '730': 'OK', '731': 'OK', '734': 'OK', '735': 'OK', '736': 'OK',
  '737': 'OK', '738': 'OK', '739': 'OK', '740': 'OK', '741': 'OK',
  '743': 'OK', '744': 'OK', '745': 'OK', '746': 'OK', '747': 'OK',
  '748': 'OK', '749': 'OK',
  '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX',
  '755': 'TX', '756': 'TX', '757': 'TX', '758': 'TX', '759': 'TX',
  '760': 'TX', '761': 'TX', '762': 'TX', '763': 'TX', '764': 'TX',
  '765': 'TX', '766': 'TX', '767': 'TX', '768': 'TX', '769': 'TX',
  '770': 'TX', '772': 'TX', '773': 'TX', '774': 'TX', '775': 'TX',
  '776': 'TX', '777': 'TX', '778': 'TX', '779': 'TX', '780': 'TX',
  '781': 'TX', '782': 'TX', '783': 'TX', '784': 'TX', '785': 'TX',
  '786': 'TX', '787': 'TX', '788': 'TX', '789': 'TX', '790': 'TX',
  '791': 'TX', '792': 'TX', '793': 'TX', '794': 'TX', '795': 'TX',
  '796': 'TX', '797': 'TX', '798': 'TX', '799': 'TX',
  '800': 'CO', '801': 'CO', '802': 'CO', '803': 'CO', '804': 'CO',
  '805': 'CO', '806': 'CO', '807': 'CO', '808': 'CO', '809': 'CO',
  '810': 'CO', '811': 'CO', '812': 'CO', '813': 'CO', '814': 'CO',
  '815': 'CO', '816': 'CO',
  '820': 'WY', '821': 'WY', '822': 'WY', '823': 'WY', '824': 'WY',
  '825': 'WY', '826': 'WY', '827': 'WY', '828': 'WY', '829': 'WY',
  '830': 'WY', '831': 'WY',
  '832': 'ID', '833': 'ID', '834': 'ID', '835': 'ID', '836': 'ID',
  '837': 'ID', '838': 'ID',
  '840': 'UT', '841': 'UT', '842': 'UT', '843': 'UT', '844': 'UT',
  '845': 'UT', '846': 'UT', '847': 'UT',
  '850': 'AZ', '851': 'AZ', '852': 'AZ', '853': 'AZ', '855': 'AZ',
  '856': 'AZ', '857': 'AZ', '859': 'AZ', '860': 'AZ', '863': 'AZ',
  '864': 'AZ', '865': 'AZ',
  '870': 'NM', '871': 'NM', '872': 'NM', '873': 'NM', '874': 'NM',
  '875': 'NM', '877': 'NM', '878': 'NM', '879': 'NM', '880': 'NM',
  '881': 'NM', '882': 'NM', '883': 'NM', '884': 'NM',
  '889': 'NV', '890': 'NV', '891': 'NV', '893': 'NV', '894': 'NV',
  '895': 'NV', '897': 'NV', '898': 'NV',
  '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA',
  '905': 'CA', '906': 'CA', '907': 'CA', '908': 'CA', '910': 'CA',
  '911': 'CA', '912': 'CA', '913': 'CA', '914': 'CA', '915': 'CA',
  '916': 'CA', '917': 'CA', '918': 'CA', '919': 'CA', '920': 'CA',
  '921': 'CA', '922': 'CA', '923': 'CA', '924': 'CA', '925': 'CA',
  '926': 'CA', '927': 'CA', '928': 'CA', '930': 'CA', '931': 'CA',
  '932': 'CA', '933': 'CA', '934': 'CA', '935': 'CA', '936': 'CA',
  '937': 'CA', '938': 'CA', '939': 'CA', '940': 'CA', '941': 'CA',
  '942': 'CA', '943': 'CA', '944': 'CA', '945': 'CA', '946': 'CA',
  '947': 'CA', '948': 'CA', '949': 'CA', '950': 'CA', '951': 'CA',
  '952': 'CA', '953': 'CA', '954': 'CA', '955': 'CA', '956': 'CA',
  '957': 'CA', '958': 'CA', '959': 'CA', '960': 'CA', '961': 'CA',
  '970': 'OR', '971': 'OR', '972': 'OR', '973': 'OR', '974': 'OR',
  '975': 'OR', '976': 'OR', '977': 'OR', '978': 'OR', '979': 'OR',
  '980': 'WA', '981': 'WA', '982': 'WA', '983': 'WA', '984': 'WA',
  '985': 'WA', '986': 'WA', '988': 'WA', '989': 'WA', '990': 'WA',
  '991': 'WA', '992': 'WA', '993': 'WA', '994': 'WA',
  '995': 'AK', '996': 'AK', '997': 'AK', '998': 'AK', '999': 'AK',
  '967': 'HI', '968': 'HI'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load version from manifest
  const manifest = chrome.runtime.getManifest();
  const versionDisplay = document.getElementById('versionDisplay');
  if (versionDisplay) {
    versionDisplay.textContent = `v${manifest.version}`;
  }

  // DOM Elements
  const proStatus = document.getElementById('proStatus');
  const walletsList = document.getElementById('walletsList');
  const noWallets = document.getElementById('noWallets');
  const rigsList = document.getElementById('rigsList');
  const noRigs = document.getElementById('noRigs');
  const proUpgradeNotice = document.getElementById('proUpgradeNotice');
  const saveStatus = document.getElementById('saveStatus');

  // Pro activation elements
  const proActivationForm = document.getElementById('proActivationForm');
  const proActiveStatus = document.getElementById('proActiveStatus');
  const licenseKeyInput = document.getElementById('licenseKey');
  const licenseKeyDisplay = document.getElementById('licenseKeyDisplay');
  const planBadge = document.getElementById('planBadge');
  const activateProBtn = document.getElementById('activateProBtn');
  const activationResult = document.getElementById('activationResult');

  // Electricity
  const zipCode = document.getElementById('zipCode');
  const lookupRateBtn = document.getElementById('lookupRateBtn');
  const lookupResult = document.getElementById('lookupResult');
  const electricityRate = document.getElementById('electricityRate');
  const currency = document.getElementById('currency');

  // Notifications
  const notifyWorkerOffline = document.getElementById('notifyWorkerOffline');
  const notifyProfitDrop = document.getElementById('notifyProfitDrop');
  const notifyBetterCoin = document.getElementById('notifyBetterCoin');
  const profitDropThreshold = document.getElementById('profitDropThreshold');
  const refreshInterval = document.getElementById('refreshInterval');

  // Email Alerts
  const emailAlertsEnabled = document.getElementById('emailAlertsEnabled');
  const emailInputGroup = document.getElementById('emailInputGroup');
  const alertEmail = document.getElementById('alertEmail');
  const emailFrequency = document.getElementById('emailFrequency');
  const emailFrequencyGroup = document.getElementById('emailFrequencyGroup');
  const testEmailGroup = document.getElementById('testEmailGroup');
  const testEmailBtn = document.getElementById('testEmailBtn');
  const testEmailResult = document.getElementById('testEmailResult');

  // Display Settings
  const showDiscovery = document.getElementById('showDiscovery');
  const liteMode = document.getElementById('liteMode');

  // Mobile app section elements
  const mobileAppSection = document.getElementById('mobileAppSection');
  const mobileAppProNotice = document.getElementById('mobileAppProNotice');

  // Modals
  const walletModal = document.getElementById('walletModal');
  const rigModal = document.getElementById('rigModal');

  // State
  let wallets = [];
  let rigs = [];
  let isPaid = false;
  let editingWalletId = null;

  // Initialize
  await loadSettings();

  // Event Listeners
  document.getElementById('addWalletBtn').addEventListener('click', () => openWalletModal());
  document.getElementById('addRigBtn').addEventListener('click', () => openRigModal());
  document.getElementById('upgradeBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mineglance.com/#pricing' });
  });

  // Mobile app upgrade button
  const upgradeMobileBtn = document.getElementById('upgradeMobileBtn');
  if (upgradeMobileBtn) {
    upgradeMobileBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://mineglance.com/#pricing' });
    });
  }

  // Auto-save: Add listeners to all settings inputs
  const autoSaveInputs = [
    electricityRate, currency, refreshInterval, profitDropThreshold, alertEmail, emailFrequency
  ];
  const autoSaveCheckboxes = [
    notifyWorkerOffline, notifyProfitDrop, notifyBetterCoin, emailAlertsEnabled, showDiscovery, liteMode
  ];

  // Debounce function for text inputs
  let saveTimeout = null;
  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveSettings(), 500);
  }

  // Add listeners for text/number inputs (debounced)
  autoSaveInputs.forEach(input => {
    input.addEventListener('input', debouncedSave);
    input.addEventListener('change', debouncedSave);
  });

  // Add listeners for checkboxes/selects (immediate save)
  autoSaveCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', saveSettings);
  });

  // Apply lite mode immediately when toggled
  liteMode.addEventListener('change', () => {
    if (liteMode.checked) {
      document.body.classList.add('lite-mode');
    } else {
      document.body.classList.remove('lite-mode');
    }
  });

  // Electricity lookup
  lookupRateBtn.addEventListener('click', lookupElectricityRate);

  // Pro activation
  activateProBtn.addEventListener('click', activatePro);

  // Pro deactivation
  const deactivateBtn = document.getElementById('deactivateBtn');
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', deactivatePro);
  }

  // Wallet modal
  document.getElementById('closeWalletModal').addEventListener('click', () => closeModal(walletModal));
  document.getElementById('cancelWalletBtn').addEventListener('click', () => closeModal(walletModal));
  document.getElementById('saveWalletBtn').addEventListener('click', saveWallet);

  // Rig modal
  document.getElementById('closeRigModal').addEventListener('click', () => closeModal(rigModal));
  document.getElementById('cancelRigBtn').addEventListener('click', () => closeModal(rigModal));
  document.getElementById('saveRigBtn').addEventListener('click', saveRig);

  // GPU selection auto-fills power
  document.getElementById('rigGpu').addEventListener('change', (e) => {
    const option = e.target.options[e.target.selectedIndex];
    const power = option.dataset.power;
    if (power) {
      document.getElementById('rigPower').value = power;
    }
  });

  // Functions
  async function loadSettings() {
    const data = await chrome.storage.local.get([
      'wallets', 'rigs', 'electricity', 'settings', 'isPaid', 'licenseKey', 'plan', 'installId', 'authToken', 'userId', 'userEmail'
    ]);

    wallets = data.wallets || [];
    rigs = data.rigs || [];
    isPaid = data.isPaid || false;

    // If authenticated, load wallets and settings from server
    if (data.authToken) {
      try {
        const [walletsRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE}/wallets/sync`, {
            headers: { 'Authorization': `Bearer ${data.authToken}` }
          }),
          fetch(`${API_BASE}/settings/sync`, {
            headers: { 'Authorization': `Bearer ${data.authToken}` }
          })
        ]);

        if (walletsRes.ok) {
          const walletsData = await walletsRes.json();
          if (walletsData.wallets) {
            wallets = walletsData.wallets;
            await chrome.storage.local.set({ wallets });
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            // Merge server settings with local
            await chrome.storage.local.set({
              electricity: {
                rate: settingsData.settings.electricity_rate || 0.12,
                currency: settingsData.settings.electricity_currency || 'USD'
              },
              settings: {
                refreshInterval: settingsData.settings.refresh_interval || 30,
                showDiscovery: settingsData.settings.show_discovery_coins !== false,
                liteMode: settingsData.settings.lite_mode === true,
                notifications: {
                  workerOffline: settingsData.settings.notify_worker_offline,
                  profitDrop: settingsData.settings.notify_profit_drop,
                  profitDropThreshold: settingsData.settings.profit_drop_threshold || 20,
                  betterCoin: settingsData.settings.notify_better_coin,
                  emailEnabled: false,
                  alertEmail: '',
                  emailFrequency: 'daily'
                }
              }
            });
          }
        }
      } catch (err) {
        console.log('Failed to load from server, using local data:', err);
      }
    }

    // Display instance ID in header
    const instanceIdEl = document.getElementById('instanceId');
    let installId = data.installId;

    // Generate install ID if it doesn't exist
    if (!installId) {
      installId = 'mg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await chrome.storage.local.set({ installId });
    }

    if (instanceIdEl) {
      // Show truncated ID but full ID on hover
      const shortId = installId.length > 16 ? installId.substring(0, 16) + '...' : installId;
      instanceIdEl.textContent = `ID: ${shortId}`;
      instanceIdEl.title = `${installId}\n\nClick to copy`;
      instanceIdEl.style.cursor = 'pointer';
      instanceIdEl.addEventListener('click', () => {
        navigator.clipboard.writeText(installId);
        instanceIdEl.textContent = 'Copied!';
        setTimeout(() => {
          instanceIdEl.textContent = `ID: ${shortId}`;
        }, 1500);
      });
    }

    // Update UI
    if (isPaid && data.licenseKey) {
      proStatus.classList.remove('hidden');
      proStatus.textContent = data.plan === 'bundle' ? 'PRO+' : 'PRO';
      proUpgradeNotice.classList.add('hidden');
      proActivationForm.classList.add('hidden');
      proActiveStatus.classList.remove('hidden');
      // Show masked license key
      const key = data.licenseKey;
      licenseKeyDisplay.textContent = key.substring(0, 7) + '••••-••••';
      planBadge.textContent = data.plan === 'bundle' ? 'PRO + MOBILE' : 'PRO';
      enableProFeatures();
    }

    // Load electricity settings
    electricityRate.value = data.electricity?.rate || 0.12;
    currency.value = data.electricity?.currency || 'USD';

    // Load notification settings
    if (data.settings?.notifications) {
      notifyWorkerOffline.checked = data.settings.notifications.workerOffline;
      notifyProfitDrop.checked = data.settings.notifications.profitDrop;
      notifyBetterCoin.checked = data.settings.notifications.betterCoin;
      profitDropThreshold.value = data.settings.notifications.profitDropThreshold || 20;

      // Email alerts
      emailAlertsEnabled.checked = data.settings.notifications.emailEnabled || false;
      alertEmail.value = data.settings.notifications.alertEmail || '';
      emailFrequency.value = data.settings.notifications.emailFrequency || 'daily';
      const showEmailFields = emailAlertsEnabled.checked;
      emailInputGroup.style.display = showEmailFields ? 'block' : 'none';
      emailFrequencyGroup.style.display = showEmailFields ? 'block' : 'none';
      testEmailGroup.style.display = showEmailFields ? 'block' : 'none';
    }

    refreshInterval.value = data.settings?.refreshInterval || 30;

    // Load display settings (default to true/enabled)
    showDiscovery.checked = data.settings?.showDiscovery !== false;
    liteMode.checked = data.settings?.liteMode === true; // Default to dark (false)

    // Apply lite mode immediately on load
    if (liteMode.checked) {
      document.body.classList.add('lite-mode');
    }

    renderWallets();
    renderRigs();
  }

  function enableProFeatures() {
    notifyWorkerOffline.disabled = false;
    notifyProfitDrop.disabled = false;
    notifyBetterCoin.disabled = false;
    profitDropThreshold.disabled = false;
    // Note: refreshInterval is NOT a Pro feature - it's always enabled
    emailAlertsEnabled.disabled = false;
    alertEmail.disabled = false;
    emailFrequency.disabled = false;
    testEmailBtn.disabled = false;

    // Show mobile app section for Pro users
    if (mobileAppSection && mobileAppProNotice) {
      mobileAppSection.classList.remove('hidden');
      mobileAppProNotice.classList.add('hidden');
    }
  }

  // Toggle email input visibility
  emailAlertsEnabled.addEventListener('change', () => {
    const show = emailAlertsEnabled.checked;
    emailInputGroup.style.display = show ? 'block' : 'none';
    emailFrequencyGroup.style.display = show ? 'block' : 'none';
    testEmailGroup.style.display = show ? 'block' : 'none';
  });

  // Test email button
  testEmailBtn.addEventListener('click', async () => {
    const email = alertEmail.value.trim();
    if (!email) {
      testEmailResult.textContent = 'Please enter an email address';
      testEmailResult.style.color = '#e53e3e';
      return;
    }

    testEmailBtn.disabled = true;
    testEmailResult.textContent = 'Sending...';
    testEmailResult.style.color = '#718096';

    try {
      const { licenseKey } = await chrome.storage.local.get(['licenseKey']);
      const response = await fetch('https://www.mineglance.com/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          alertType: 'worker_offline',
          walletName: 'Test Wallet',
          message: 'This is a test email to verify your MineGlance email alerts are working correctly.',
          email
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        testEmailResult.textContent = 'Test email sent! Check your inbox.';
        testEmailResult.style.color = '#38a169';
      } else {
        testEmailResult.textContent = data.error || 'Failed to send test email';
        testEmailResult.style.color = '#e53e3e';
      }
    } catch (e) {
      testEmailResult.textContent = 'Error: ' + e.message;
      testEmailResult.style.color = '#e53e3e';
    }

    testEmailBtn.disabled = false;
  });

  function renderWallets() {
    if (wallets.length === 0) {
      walletsList.classList.add('hidden');
      noWallets.classList.remove('hidden');
      return;
    }

    walletsList.classList.remove('hidden');
    noWallets.classList.add('hidden');

    walletsList.innerHTML = wallets.map((wallet, index) => `
      <div class="wallet-item" data-id="${wallet.id}" data-index="${index}" draggable="true">
        <div class="drag-handle" title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <div class="wallet-info">
          <div class="wallet-name">
            ${wallet.name}
            <span class="tag">${wallet.coin.toUpperCase()}</span>
            <span class="tag ${wallet.enabled ? 'online' : 'offline'}">${wallet.enabled ? 'Active' : 'Disabled'}</span>
          </div>
          <div class="wallet-details">
            ${wallet.pool} • ${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)} • ${wallet.power || 200}W
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-small btn-secondary edit-wallet-btn">Edit</button>
          <button class="btn btn-small btn-danger delete-wallet-btn">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for edit/delete
    walletsList.querySelectorAll('.edit-wallet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.wallet-item').dataset.id;
        editWallet(id);
      });
    });

    walletsList.querySelectorAll('.delete-wallet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.wallet-item').dataset.id;
        deleteWallet(id);
      });
    });

    // Add drag and drop event listeners
    setupDragAndDrop();
  }

  // Drag and drop functionality for reordering wallets
  let draggedItem = null;
  let draggedIndex = null;

  function setupDragAndDrop() {
    const items = walletsList.querySelectorAll('.wallet-item');

    items.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
    });
  }

  function handleDragStart(e) {
    draggedItem = this;
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    walletsList.querySelectorAll('.wallet-item').forEach(item => {
      item.classList.remove('drag-over');
    });
    draggedItem = null;
    draggedIndex = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
      this.classList.add('drag-over');
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this === draggedItem) return;

    const dropIndex = parseInt(this.dataset.index);

    // Reorder wallets array
    const movedWallet = wallets.splice(draggedIndex, 1)[0];
    wallets.splice(dropIndex, 0, movedWallet);

    // Save new order
    await chrome.storage.local.set({ wallets });

    // Re-render
    renderWallets();
  }

  function renderRigs() {
    if (rigs.length === 0) {
      rigsList.classList.add('hidden');
      noRigs.classList.remove('hidden');
      return;
    }

    rigsList.classList.remove('hidden');
    noRigs.classList.add('hidden');

    rigsList.innerHTML = rigs.map(rig => `
      <div class="rig-item" data-id="${rig.id}">
        <div class="rig-info">
          <div class="rig-name">${rig.name}</div>
          <div class="rig-details">
            ${rig.gpu} × ${rig.quantity} • ${rig.power}W each • ${rig.power * rig.quantity}W total
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-small btn-danger delete-rig-btn">Delete</button>
        </div>
      </div>
    `).join('');

    rigsList.querySelectorAll('.delete-rig-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.rig-item').dataset.id;
        deleteRig(id);
      });
    });
  }

  function lookupElectricityRate() {
    const zip = zipCode.value.trim();

    if (zip.length < 3) {
      showLookupResult('Enter at least 3 digits of your ZIP code', 'error');
      return;
    }

    const prefix = zip.slice(0, 3);
    const state = ZIP_TO_STATE[prefix];

    if (!state) {
      showLookupResult('Could not find rate for this ZIP code', 'error');
      return;
    }

    const rate = STATE_RATES[state];
    if (rate) {
      electricityRate.value = rate.toFixed(2);
      showLookupResult(`Found ${state} average rate: $${rate.toFixed(2)}/kWh`, 'success');
    } else {
      showLookupResult('Rate not available for this state', 'error');
    }
  }

  function showLookupResult(message, type) {
    lookupResult.textContent = message;
    lookupResult.className = `lookup-result ${type}`;
    lookupResult.classList.remove('hidden');

    setTimeout(() => {
      lookupResult.classList.add('hidden');
    }, 5000);
  }

  async function activatePro() {
    const licenseKey = licenseKeyInput.value.trim().toUpperCase();

    // Validate license key format: XXXX-XXXX-XXXX-XXXX (alphanumeric)
    // Also accept legacy MG-XXXX-XXXX-XXXX format for existing users
    const newKeyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const legacyKeyPattern = /^MG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!licenseKey || (!newKeyPattern.test(licenseKey) && !legacyKeyPattern.test(licenseKey))) {
      showActivationResult('Please enter a valid license key (XXXX-XXXX-XXXX-XXXX)', 'error');
      return;
    }

    activateProBtn.disabled = true;
    activateProBtn.textContent = 'Activating...';

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'activateLicense', licenseKey },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.success && response.isPro) {
        const msg = response.activations
          ? `Activated! (${response.activations}/${response.maxActivations} devices)`
          : 'License activated successfully!';
        showActivationResult(msg, 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        showActivationResult(response.error || 'Invalid license key.', 'error');
      }
    } catch (error) {
      showActivationResult('Connection error. Please try again.', 'error');
    } finally {
      activateProBtn.disabled = false;
      activateProBtn.textContent = 'Activate';
    }
  }

  function showActivationResult(message, type) {
    activationResult.textContent = message;
    activationResult.className = `lookup-result ${type}`;
    activationResult.classList.remove('hidden');

    if (type !== 'success') {
      setTimeout(() => {
        activationResult.classList.add('hidden');
      }, 5000);
    }
  }

  async function deactivatePro() {
    if (!confirm('Are you sure you want to deactivate your Pro license on this device?')) {
      return;
    }

    // Clear license data from storage
    await chrome.storage.local.remove(['isPaid', 'licenseKey', 'plan']);

    // Show activation form again
    proStatus.classList.add('hidden');
    proUpgradeNotice.classList.remove('hidden');
    proActivationForm.classList.remove('hidden');
    proActiveStatus.classList.add('hidden');
    licenseKeyInput.value = '';

    // Disable pro features (but NOT refreshInterval - that's free)
    notifyWorkerOffline.disabled = true;
    notifyProfitDrop.disabled = true;
    notifyBetterCoin.disabled = true;
    profitDropThreshold.disabled = true;
    emailAlertsEnabled.disabled = true;
    alertEmail.disabled = true;
    emailFrequency.disabled = true;
    testEmailBtn.disabled = true;

    alert('License deactivated. You can re-activate anytime with your license key.');
  }

  function openWalletModal(wallet = null) {
    editingWalletId = wallet?.id || null;
    document.getElementById('walletModalTitle').textContent = wallet ? 'Edit Wallet' : 'Add Wallet';

    document.getElementById('walletName').value = wallet?.name || '';
    document.getElementById('walletPool').value = wallet?.pool || '2miners';
    document.getElementById('walletCoin').value = wallet?.coin || 'rvn';
    document.getElementById('walletAddress').value = wallet?.address || '';
    document.getElementById('walletPower').value = wallet?.power || '';

    walletModal.classList.remove('hidden');
  }

  function editWallet(id) {
    const wallet = wallets.find(w => w.id === id);
    if (wallet) {
      openWalletModal(wallet);
    }
  }

  async function saveWallet() {
    const name = document.getElementById('walletName').value.trim();
    const pool = document.getElementById('walletPool').value;
    const coin = document.getElementById('walletCoin').value;
    const address = document.getElementById('walletAddress').value.trim();
    const power = parseInt(document.getElementById('walletPower').value) || 200;

    if (!name || !address) {
      alert('Please fill in wallet name and address');
      return;
    }

    // Check for auth token for cloud sync
    const { authToken } = await chrome.storage.local.get('authToken');

    if (editingWalletId) {
      // Update existing
      const index = wallets.findIndex(w => w.id === editingWalletId);
      if (index !== -1) {
        wallets[index] = { ...wallets[index], name, pool, coin, address, power };

        // Sync to server if authenticated
        if (authToken) {
          try {
            await fetch(`${API_BASE}/wallets/sync`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                id: editingWalletId,
                name, pool, coin, address, power
              })
            });
          } catch (err) {
            console.log('Wallet sync failed, saved locally:', err);
          }
        }
      }
    } else {
      // Add new
      const newWallet = {
        id: Date.now().toString(),
        name,
        pool,
        coin,
        address,
        power,
        enabled: true
      };

      // Sync to server if authenticated
      if (authToken) {
        try {
          const response = await fetch(`${API_BASE}/wallets/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newWallet)
          });
          const data = await response.json();
          if (data.wallet?.id) {
            newWallet.id = data.wallet.id; // Use server-assigned ID
          }
          if (data.limitReached) {
            alert('Free accounts are limited to 1 wallet. Upgrade to Pro for unlimited wallets.');
            return;
          }
        } catch (err) {
          console.log('Wallet sync failed, saved locally:', err);
        }
      }

      wallets.push(newWallet);
    }

    // Auto-save wallets immediately
    await chrome.storage.local.set({ wallets });
    renderWallets();
    closeModal(walletModal);
    showSaveStatus();
  }

  async function deleteWallet(id) {
    if (confirm('Delete this wallet?')) {
      wallets = wallets.filter(w => w.id !== id);
      await chrome.storage.local.set({ wallets });

      // Sync deletion to server if authenticated
      const { authToken } = await chrome.storage.local.get('authToken');
      if (authToken) {
        try {
          await fetch(`${API_BASE}/wallets/sync?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
        } catch (err) {
          console.log('Wallet delete sync failed:', err);
        }
      }

      renderWallets();
    }
  }

  function showSaveStatus() {
    saveStatus.classList.remove('hidden');
    setTimeout(() => saveStatus.classList.add('hidden'), 2000);
  }

  function openRigModal() {
    document.getElementById('rigName').value = '';
    document.getElementById('rigGpu').value = '';
    document.getElementById('rigPower').value = '';
    document.getElementById('rigQuantity').value = '1';
    rigModal.classList.remove('hidden');
  }

  function saveRig() {
    const name = document.getElementById('rigName').value.trim();
    const gpu = document.getElementById('rigGpu').value;
    const power = parseInt(document.getElementById('rigPower').value) || 200;
    const quantity = parseInt(document.getElementById('rigQuantity').value) || 1;

    if (!name || !gpu) {
      alert('Please fill in rig name and select GPU');
      return;
    }

    rigs.push({
      id: Date.now().toString(),
      name,
      gpu,
      power,
      quantity
    });

    renderRigs();
    closeModal(rigModal);
  }

  function deleteRig(id) {
    if (confirm('Delete this rig?')) {
      rigs = rigs.filter(r => r.id !== id);
      renderRigs();
    }
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
    editingWalletId = null;
  }

  async function saveSettings() {
    const settingsToSave = {
      wallets,
      rigs,
      electricity: {
        rate: parseFloat(electricityRate.value) || 0.12,
        currency: currency.value
      },
      settings: {
        refreshInterval: parseInt(refreshInterval.value) || 30,
        showDiscovery: showDiscovery.checked,
        liteMode: liteMode.checked,
        notifications: {
          workerOffline: notifyWorkerOffline.checked,
          profitDrop: notifyProfitDrop.checked,
          profitDropThreshold: parseInt(profitDropThreshold.value) || 20,
          betterCoin: notifyBetterCoin.checked,
          emailEnabled: emailAlertsEnabled.checked,
          alertEmail: alertEmail.value.trim(),
          emailFrequency: emailFrequency.value
        }
      }
    };

    await chrome.storage.local.set(settingsToSave);

    // Sync settings to server if authenticated
    const { authToken } = await chrome.storage.local.get('authToken');
    if (authToken) {
      try {
        await fetch(`${API_BASE}/settings/sync`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_interval: settingsToSave.settings.refreshInterval,
            electricity_rate: settingsToSave.electricity.rate,
            electricity_currency: settingsToSave.electricity.currency,
            currency: settingsToSave.electricity.currency,
            notify_worker_offline: settingsToSave.settings.notifications.workerOffline,
            notify_profit_drop: settingsToSave.settings.notifications.profitDrop,
            profit_drop_threshold: settingsToSave.settings.notifications.profitDropThreshold,
            notify_better_coin: settingsToSave.settings.notifications.betterCoin,
            show_discovery_coins: settingsToSave.settings.showDiscovery,
            lite_mode: settingsToSave.settings.liteMode
          })
        });
      } catch (err) {
        console.log('Settings sync failed:', err);
      }
    }

    // Update auto-refresh
    chrome.runtime.sendMessage({ action: 'setupAutoRefresh' });

    // Show saved status
    saveStatus.classList.remove('hidden');
    setTimeout(() => {
      saveStatus.classList.add('hidden');
    }, 2000);
  }

  // Close modals on background click
  [walletModal, rigModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
});
