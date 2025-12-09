use wasm_bindgen::prelude::*;
use serde::{Deserialize};

#[derive(Deserialize, Debug, Default, Clone)]
pub struct AttentionParcelDerived {
    pub completion_ratio: f32,
    pub engagement_score: f32,
    pub mood_scalar: f32,
    pub device_lane: Option<String>,
}

#[derive(Deserialize, Debug, Default, Clone)]
pub struct AttentionParcel {
    pub derived: AttentionParcelDerived,
    pub timestamp_ms: i64,
}

#[wasm_bindgen]
pub struct CityMoodApp {
    mood_scalar: f32,
    completion: f32,
    device_lane: String,
}

#[wasm_bindgen]
impl CityMoodApp {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CityMoodApp {
        CityMoodApp {
            mood_scalar: 0.3,
            completion: 0.0,
            device_lane: "DESKTOP_HD".to_string(),
        }
    }

    #[wasm_bindgen]
    pub fn on_event(&mut self, parcel_json: &str) {
        // Parse minimal derived fields from the ALN parcel
        let parsed: Result<AttentionParcel, _> = serde_json::from_str(parcel_json);
        if let Ok(parcel) = parsed {
            let d = parcel.derived;
            self.mood_scalar = self.mood_scalar.max(d.mood_scalar).min(1.0);
            self.completion = d.completion_ratio;
            if let Some(dl) = d.device_lane { self.device_lane = dl; }
        }
    }

    #[wasm_bindgen]
    pub fn frame(&self) -> f32 {
        // Return a mood scalar for host app to use; host will render accordingly
        self.mood_scalar
    }
}
