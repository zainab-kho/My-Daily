export const ui = {
  changeDisplay: (element, display) => {
    element.style.display = display;
  },

  changeStyle: (element, property, value) => {
    element.style[property] = value;
  },

  rgbToHex: (rgb) => {
    let rgbArray = rgb.match(/\d+/g); // extract numbers
    return `#${((1 << 24) + (parseInt(rgbArray[0]) << 16) + (parseInt(rgbArray[1]) << 8) + parseInt(rgbArray[2])).toString(16).slice(1).toUpperCase()}`;
  },

  toggleDisplay: (element) => {
    element.style.display = element.style.display === 'block' ? 'none' : 'block';
  },

  formatDate: (date) => {
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return formattedDate.toLowerCase();
  },

  formatDateToYYYYMMDD: (date) => {
    if (!(date instanceof Date)) {
      console.error('formatDateToYYYMMDD expects a Date object');
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  formatDateToYYYYMMDDs: (dateString) => {
  const date = new Date(dateString);  // create a Date object from the string
  const year = new Date().getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');  // get the month (add 1 because months are 0-indexed)
  const day = String(date.getDate()).padStart(2, '0');  // get the day of the month

  return `${year}-${month}-${day}`;  // format in YYYY-MM-DD
},

formatStringToDate: (dateString) => {
  const parts = dateString.split('-');
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

  return dateObj;
},

getDayOfYear: (date) => {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  return dayOfYear + 1;
}

}

document.querySelector('.close').addEventListener('click', () => {
  window.electronAPI.closeApp();
});

document.querySelector('.minimize').addEventListener('click', () => {
  window.electronAPI.minimizeApp();
});

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  // if (savedTheme === 'ocean') {
  //   document.documentElement.classList.add('ocean-blue-theme');
  // }

  switch (savedTheme) {
    case 'strawberry-blossom':
      document.documentElement.classList.add('strawberry-blossom-theme');
      break;
    case 'default':
      document.documentElement.classList.add('default-theme');
      break;
    case 'sunny':
      document.documentElement.classList.add('sunny-theme');
      break;
    case 'cozy':
      document.documentElement.classList.add('cozy-theme');
      break;
    case 'coffee':
      document.documentElement.classList.add('coffee-theme');
      break;
    case 'forest':
      document.documentElement.classList.add('forest-theme');
      break;
    case 'ocean':
      document.documentElement.classList.add('ocean-blue-theme');
      break;
  }
});