export const ERC20_ABI = [
  { name:'name',      type:'function', stateMutability:'view',        inputs:[],                                                                     outputs:[{type:'string'}]  },
  { name:'symbol',    type:'function', stateMutability:'view',        inputs:[],                                                                     outputs:[{type:'string'}]  },
  { name:'decimals',  type:'function', stateMutability:'view',        inputs:[],                                                                     outputs:[{type:'uint8'}]   },
  { name:'totalSupply',type:'function',stateMutability:'view',        inputs:[],                                                                     outputs:[{type:'uint256'}] },
  { name:'balanceOf', type:'function', stateMutability:'view',        inputs:[{name:'account',type:'address'}],                                      outputs:[{type:'uint256'}] },
  { name:'allowance', type:'function', stateMutability:'view',        inputs:[{name:'owner',type:'address'},{name:'spender',type:'address'}],         outputs:[{type:'uint256'}] },
  { name:'approve',   type:'function', stateMutability:'nonpayable',  inputs:[{name:'spender',type:'address'},{name:'amount',type:'uint256'}],        outputs:[{type:'bool'}]    },
  { name:'transfer',  type:'function', stateMutability:'nonpayable',  inputs:[{name:'to',type:'address'},{name:'amount',type:'uint256'}],             outputs:[{type:'bool'}]    },
] as const;

export const FAUCET_ABI = [
  { name:'claim',              type:'function', stateMutability:'nonpayable', inputs:[], outputs:[] },
  { name:'claimAmount',        type:'function', stateMutability:'view',       inputs:[], outputs:[{type:'uint256'}] },
  { name:'cooldown',           type:'function', stateMutability:'view',       inputs:[], outputs:[{type:'uint256'}] },
  { name:'lastClaim',          type:'function', stateMutability:'view',       inputs:[{name:'user',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'timeUntilNextClaim', type:'function', stateMutability:'view',       inputs:[{name:'user',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'faucetBalance',      type:'function', stateMutability:'view',       inputs:[], outputs:[{type:'uint256'}] },
  { name:'totalClaimed',       type:'function', stateMutability:'view',       inputs:[], outputs:[{type:'uint256'}] },
  { name:'totalClaimers',      type:'function', stateMutability:'view',       inputs:[], outputs:[{type:'uint256'}] },
] as const;

const LISTING_TUPLE = {
  type:'tuple',
  components:[
    {name:'id',             type:'uint256'},
    {name:'seller',         type:'address'},
    {name:'tokenAddress',   type:'address'},
    {name:'totalAmount',    type:'uint256'},
    {name:'remainingAmount',type:'uint256'},
    {name:'pricePerHalf',   type:'uint256'},
    {name:'priceForFull',   type:'uint256'},
    {name:'acceptedTokens', type:'address[]'},
    {name:'acceptsAnyToken',type:'bool'},
    {name:'fillTerms',      type:'uint8'},
    {name:'description',    type:'string'},
    {name:'active',         type:'bool'},
    {name:'createdAt',      type:'uint256'},
    {name:'editedAt',       type:'uint256'},
    {name:'offerCount',     type:'uint256'},
  ],
} as const;

const OFFER_TUPLE = {
  type:'tuple',
  components:[
    {name:'id',         type:'uint256'},
    {name:'listingId',  type:'uint256'},
    {name:'offerMaker', type:'address'},
    {name:'offerToken', type:'address'},
    {name:'offerAmount',type:'uint256'},
    {name:'forHalf',    type:'bool'},
    {name:'message',    type:'string'},
    {name:'active',     type:'bool'},
    {name:'accepted',   type:'bool'},
    {name:'createdAt',  type:'uint256'},
  ],
} as const;

export const OTC_ABI = [
  { name:'listingCount', type:'function', stateMutability:'view', inputs:[],                                        outputs:[{type:'uint256'}] },
  { name:'offerCount',   type:'function', stateMutability:'view', inputs:[],                                        outputs:[{type:'uint256'}] },
  { name:'totalTrades',  type:'function', stateMutability:'view', inputs:[],                                        outputs:[{type:'uint256'}] },

  { name:'listToken', type:'function', stateMutability:'payable',
    inputs:[
      {name:'tokenAddress',   type:'address'},
      {name:'amount',         type:'uint256'},
      {name:'priceForFull',   type:'uint256'},
      {name:'acceptedTokens', type:'address[]'},
      {name:'acceptsAnyToken',type:'bool'},
      {name:'fillTerms',      type:'uint8'},
      {name:'description',    type:'string'},
    ], outputs:[] },

  { name:'buyWithETH', type:'function', stateMutability:'payable',
    inputs:[{name:'listingId',type:'uint256'},{name:'buyHalf',type:'bool'}], outputs:[] },

  { name:'buyWithToken', type:'function', stateMutability:'payable',
    inputs:[{name:'listingId',type:'uint256'},{name:'buyHalf',type:'bool'},{name:'payToken',type:'address'},{name:'payAmount',type:'uint256'}], outputs:[] },

  { name:'makeOfferWithETH', type:'function', stateMutability:'payable',
    inputs:[{name:'listingId',type:'uint256'},{name:'forHalf',type:'bool'},{name:'message',type:'string'}], outputs:[] },

  { name:'makeOfferWithToken', type:'function', stateMutability:'payable',
    inputs:[{name:'listingId',type:'uint256'},{name:'forHalf',type:'bool'},{name:'offerToken',type:'address'},{name:'offerAmount',type:'uint256'},{name:'message',type:'string'}], outputs:[] },

  { name:'acceptOffer',   type:'function', stateMutability:'nonpayable', inputs:[{name:'offerId',type:'uint256'}],   outputs:[] },
  { name:'ignoreOffer',   type:'function', stateMutability:'nonpayable', inputs:[{name:'offerId',type:'uint256'}],   outputs:[] },
  { name:'cancelListing', type:'function', stateMutability:'payable',    inputs:[{name:'listingId',type:'uint256'}], outputs:[] },

  { name:'editListing', type:'function', stateMutability:'payable',
    inputs:[
      {name:'listingId',       type:'uint256'},
      {name:'newPriceForFull', type:'uint256'},
      {name:'newAcceptedTokens',type:'address[]'},
      {name:'newAcceptsAnyToken',type:'bool'},
      {name:'newFillTerms',    type:'uint8'},
      {name:'newDescription',  type:'string'},
    ], outputs:[] },

  { name:'getListing',       type:'function', stateMutability:'view', inputs:[{name:'id',type:'uint256'}],           outputs:[LISTING_TUPLE] },
  { name:'getOffer',         type:'function', stateMutability:'view', inputs:[{name:'id',type:'uint256'}],           outputs:[OFFER_TUPLE]  },
  { name:'getListingOffers', type:'function', stateMutability:'view', inputs:[{name:'listingId',type:'uint256'}],    outputs:[{type:'uint256[]'}] },
  { name:'getUserListings',  type:'function', stateMutability:'view', inputs:[{name:'user',type:'address'}],         outputs:[{type:'uint256[]'}] },
  { name:'getUserOffers',    type:'function', stateMutability:'view', inputs:[{name:'user',type:'address'}],         outputs:[{type:'uint256[]'}] },
  { name:'contractReserveBalance', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint256'}] },
] as const;
