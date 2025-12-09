use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct CityMoodApp {
    mood_score: f32,
    last_update_ms: u64,
}

#[wasm_bindgen]
impl CityMoodApp {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CityMoodApp {
        CityMoodApp {
            mood_score: 0.5,
            last_update_ms: 0,
        }
    }

    #[wasm_bindgen(js_name = init)]
    pub fn init(&mut self) {
        self.mood_score = 0.5;
        self.last_update_ms = 0;
    }

    #[wasm_bindgen(js_name = on_event)]
    pub fn on_event(&mut self, kind: &str, value: f32, timestamp_ms: u64) {
        let delta = match kind {
            "positive" => value.abs().min(1.0),
            "negative" => -value.abs().min(1.0),
            _ => 0.0,
        };
        let updated = (self.mood_score + delta * 0.1).clamp(0.0, 1.0);
        self.mood_score = updated;
        self.last_update_ms = timestamp_ms;
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
