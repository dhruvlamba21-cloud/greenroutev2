/* Demo data. Coordinates are approximate (rounded) and meant for illustration only. */
const GreenData = {
  PLACES: [
    {name:"Connaught Place",lat:28.6315,lng:77.2167},
    {name:"India Gate",lat:28.6129,lng:77.2295},
    {name:"Red Fort",lat:28.6562,lng:77.2410},
    {name:"Qutub Minar",lat:28.5245,lng:77.1855},
    {name:"Lotus Temple",lat:28.5535,lng:77.2588},
    {name:"IIT Delhi",lat:28.5450,lng:77.1926},
    {name:"Delhi University North Campus",lat:28.6900,lng:77.2100},
    {name:"JNU",lat:28.5402,lng:77.1662},
    {name:"IGI Airport T3",lat:28.5562,lng:77.1000},
    {name:"Cyber Hub Gurugram",lat:28.4950,lng:77.0890},
    {name:"Huda City Centre Gurugram",lat:28.4593,lng:77.0727},
    {name:"Sector 18 Noida",lat:28.5700,lng:77.3219},
    {name:"Sector 62 Noida",lat:28.6270,lng:77.3649},
    {name:"Anand Vihar ISBT",lat:28.6469,lng:77.3160},
    {name:"Vaishali Ghaziabad",lat:28.6500,lng:77.3400},
    {name:"Hauz Khas Village",lat:28.5535,lng:77.1930},
    {name:"Saket Citywalk",lat:28.5285,lng:77.2190},
    {name:"Dwarka Sector 21",lat:28.5522,lng:77.0583},
    {name:"Nehru Place",lat:28.5491,lng:77.2518},
    {name:"Karol Bagh",lat:28.6510,lng:77.1907},
    {name:"Lajpat Nagar Market",lat:28.5677,lng:77.2430},
    {name:"Akshardham Temple",lat:28.6127,lng:77.2773},
    {name:"Kashmere Gate ISBT",lat:28.6675,lng:77.2282}
  ],
  EXAMPLES: [
    ["Connaught Place","India Gate"],
    ["Hauz Khas Village","Cyber Hub Gurugram"],
    ["Sector 18 Noida","Connaught Place"],
    ["IIT Delhi","Nehru Place"],
    ["Vaishali Ghaziabad","Dwarka Sector 21"]
  ],
  /* A subset of Delhi Metro / Rapid Metro stations, approximate coordinates. */
  STATIONS: [
    ["Rajiv Chowk",28.6328,77.2197],["Kashmere Gate",28.6675,77.2282],["New Delhi",28.6429,77.2217],
    ["Hauz Khas",28.5434,77.2067],["Saket",28.5206,77.2017],["Huda City Centre",28.4593,77.0727],
    ["Qutab Minar",28.5139,77.1858],["Central Secretariat",28.6154,77.2117],["Lajpat Nagar",28.5703,77.2373],
    ["Nehru Place",28.5491,77.2518],["Kalkaji Mandir",28.5498,77.2587],["Botanical Garden",28.5640,77.3340],
    ["Noida Sector 18",28.5707,77.3260],["Noida City Centre",28.5744,77.3560],["Akshardham",28.6180,77.2790],
    ["Anand Vihar",28.6469,77.3159],["Vaishali",28.6500,77.3400],["Dwarka Sector 21",28.5522,77.0583],
    ["Dwarka Mor",28.6190,77.0330],["Janakpuri West",28.6294,77.0788],["Rajouri Garden",28.6492,77.1226],
    ["Kirti Nagar",28.6552,77.1432],["Azadpur",28.7069,77.1783],["Vishwavidyalaya",28.6951,77.2147],
    ["Chandni Chowk",28.6577,77.2300],["INA",28.5753,77.2095],["AIIMS",28.5659,77.2074],
    ["Green Park",28.5585,77.2067],["Jor Bagh",28.5875,77.2127],["Khan Market",28.6008,77.2269],
    ["JLN Stadium",28.5902,77.2339],["Okhla NSIC",28.5545,77.2646],["Sarita Vihar",28.5290,77.2890],
    ["MG Road Gurugram",28.4797,77.0805],["IFFCO Chowk",28.4720,77.0720],["Sikanderpur",28.4817,77.0933],
    ["Badarpur Border",28.4936,77.3034],["Noida Electronic City",28.6200,77.3730],["Noida Sector 62",28.6270,77.3650],
    ["IGI Airport T3",28.5562,77.0849],["Karol Bagh",28.6440,77.1880],["Patel Chowk",28.6226,77.2137],["Mandi House",28.6258,77.2342]
  ].map(s=>({name:s[0],lat:s[1],lng:s[2]}))
};
if (typeof module !== 'undefined') module.exports = GreenData;
