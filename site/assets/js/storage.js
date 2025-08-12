const storage={ns:'wms_demo_',get(key,def){try{const raw=localStorage.getItem(this.ns+key);return raw?JSON.parse(raw):def;}catch(e){console.error(e);return def;}},set(key,val){try{localStorage.setItem(this.ns+key,JSON.stringify(val));}catch(e){console.error(e);}},remove(key){localStorage.removeItem(this.ns+key);},clearAll(){Object.keys(localStorage).filter(k=>k.startsWith(this.ns)).forEach(k=>localStorage.removeItem(k));}};


