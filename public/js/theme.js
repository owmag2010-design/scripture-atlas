// Applies the saved theme and text size before the page paints, so there is no flash of the wrong theme.
try{var t=JSON.parse(localStorage.getItem("scripture-atlas:v1")||"{}").settings||{};if(t.theme)document.documentElement.dataset.theme=t.theme;if(t.size)document.documentElement.dataset.size=t.size}catch(e){}
