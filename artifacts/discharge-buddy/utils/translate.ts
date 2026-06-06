import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache translations to avoid hitting the API repeatedly for the same string
const TRANSLATION_CACHE_KEY = "discharge_buddy_translations_cache";

let translationCache: Record<string, Record<string, string>> = {};

// Initialize cache
AsyncStorage.getItem(TRANSLATION_CACHE_KEY).then((data) => {
  if (data) {
    try {
      translationCache = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse translation cache", e);
    }
  }
});

const saveCache = async () => {
  try {
    await AsyncStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache));
  } catch (e) {
    console.error("Failed to save translation cache", e);
  }
};

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || targetLanguage === "en" || text.trim() === "") return text;
  
  // Check cache
  if (translationCache[targetLanguage] && translationCache[targetLanguage][text]) {
    return translationCache[targetLanguage][text];
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Google API returns nested arrays like [[[ "translated", "original", ... ]]]
    let translated = "";
    if (data && data[0]) {
      for (let i = 0; i < data[0].length; i++) {
        if (data[0][i][0]) {
          translated += data[0][i][0];
        }
      }
    }
    
    if (translated) {
      // Save to cache
      if (!translationCache[targetLanguage]) {
        translationCache[targetLanguage] = {};
      }
      translationCache[targetLanguage][text] = translated;
      // Debounce save or just save asynchronously
      saveCache();
      
      return translated;
    }
    
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}
