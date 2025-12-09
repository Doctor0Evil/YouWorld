use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct CityMoodApp {
    mood_score: f32,
    quality_score: f32,
    load_score: f32,
    last_update_ms: u64,
}

#[wasm_bindgen]
impl CityMoodApp {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CityMoodApp {
        CityMoodApp {
            mood_score: 0.5,
            quality_score: 0.5,
            load_score: 0.0,
            last_update_ms: 0,
        }
    }

    #[wasm_bindgen(js_name = init)]
    pub fn init(&mut self) {
        self.mood_score = 0.5;
        self.quality_score = 0.5;
        self.load_score = 0.0;
        self.last_update_ms = 0;
    }

    #[wasm_bindgen(js_name = on_event)]
    pub fn on_event(&mut self, kind: &str, value: f32, timestamp_ms: u64) {
        let delta = match kind {
            "positive" => value.abs().min(1.0),
            "negative" => -value.abs().min(1.0),
            "quality_up" => {
                self.quality_score = (self.quality_score + value.abs() * 0.1).clamp(0.0, 1.0);
                0.0
            }
            "quality_down" => {
                self.quality_score = (self.quality_score - value.abs() * 0.1).clamp(0.0, 1.0);
                0.0
            }
            _ => 0.0,
        };

        if delta != 0.0 {
            self.mood_score = (self.mood_score + delta * 0.1).clamp(0.0, 1.0);
        }

        self.last_update_ms = timestamp_ms;
    }

    #[wasm_bindgen(js_name = set_derived)]
    pub fn set_derived(&mut self, completion_ratio: f32, engagement_score: f32, ar_complexity_budget: &str, timestamp_ms: u64) {
        // Mood: biased towards engagement, slightly towards completion
        let mood = (engagement_score * 0.7 + completion_ratio * 0.3)
            .clamp(0.0, 1.0);

        // Quality: map complexity budget into a normalized score
        let quality = match ar_complexity_budget {
            "HIGH" => 1.0,
            "MEDIUM" => 0.7,
            "LOW" => 0.4,
            _ => 0.5,
        };

        // Load: simple heuristic, higher complexity => higher load
        let load = match ar_complexity_budget {
            "HIGH" => 0.9,
            "MEDIUM" => 0.5,
            "LOW" => 0.2,
            _ => 0.3,
        };

        self.mood_score = mood;
        self.quality_score = quality;
        self.load_score = load;
        self.last_update_ms = timestamp_ms;
    }

    #[wasm_bindgen(js_name = frame)]
    pub fn frame(&mut self, now_ms: u64) -> f32 {
        let age_ms = now_ms.saturating_sub(self.last_update_ms);
        if age_ms > 3_000 {
            let towards_neutral = 0.5_f32;
            self.mood_score = self.mood_score + (towards_neutral - self.mood_score) * 0.05;
            self.load_score = (self.load_score - 0.02).max(0.0);
        }
        self.mood_score
    }

    #[wasm_bindgen(js_name = mood_score)]
    pub fn mood_score(&self) -> f32 {
        self.mood_score
    }

    #[wasm_bindgen(js_name = quality_score)]
    pub fn quality_score(&self) -> f32 {
        self.quality_score
    }

    #[wasm_bindgen(js_name = load_score)]
    pub fn load_score(&self) -> f32 {
        self.load_score
    }

    #[wasm_bindgen(js_name = frame)]
    pub fn frame(&mut self, now_ms: u64) -> f32 {
        let age_ms = now_ms.saturating_sub(self.last_update_ms);
        if age_ms > 5_000 {
            let towards_neutral = 0.5_f32;
            self.mood_score = self.mood_score + (towards_neutral - self.mood_score) * 0.05;
        }
        self.mood_score
    }

    #[wasm_bindgen(js_name = mood_score)]
    pub fn mood_score(&self) -> f32 {
        self.mood_score
    }
}
