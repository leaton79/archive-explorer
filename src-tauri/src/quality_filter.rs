use regex::Regex;
use once_cell::sync::Lazy;

static EXCLUSION_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        Regex::new(r"(?i)^test").unwrap(),
        Regex::new(r"(?i)test$").unwrap(),
        Regex::new(r"^TEST").unwrap(),
        Regex::new(r"(?i)TESTIMAGES").unwrap(),
        Regex::new(r"(?i)testfile").unwrap(),
        Regex::new(r"(?i)^IMG_\d+$").unwrap(),
        Regex::new(r"(?i)^DSC_?\d+$").unwrap(),
        Regex::new(r"(?i)^DCIM").unwrap(),
        Regex::new(r"^P\d{7,}").unwrap(),
        Regex::new(r"(?i)^Screenshot").unwrap(),
        Regex::new(r"(?i)^Untitled").unwrap(),
        Regex::new(r"(?i)^undefined$").unwrap(),
        Regex::new(r"(?i)^null$").unwrap(),
        Regex::new(r"^\d{8}[_\s]\d{6}$").unwrap(),
        Regex::new(r"^\d{14,}$").unwrap(),
        Regex::new(r"(?i)^MVI_\d+").unwrap(),
        Regex::new(r"(?i)^MOV_\d+").unwrap(),
        Regex::new(r"(?i)^VID_\d+").unwrap(),
        Regex::new(r"(?i)^IMG-\d+").unwrap(),
        Regex::new(r"(?i)^WA\d+").unwrap(),
        Regex::new(r"(?i)^photo\d*$").unwrap(),
        Regex::new(r"(?i)^image\d*$").unwrap(),
        Regex::new(r"(?i)^video\d*$").unwrap(),
        Regex::new(r"(?i)^audio\d*$").unwrap(),
        Regex::new(r"(?i)^file\d*$").unwrap(),
        Regex::new(r"(?i)example").unwrap(),
        Regex::new(r"(?i)sample").unwrap(),
        Regex::new(r"(?i)placeholder").unwrap(),
        Regex::new(r"(?i)dummy").unwrap(),
        Regex::new(r"(?i)^cover$").unwrap(),
        Regex::new(r"(?i)^front$").unwrap(),
        Regex::new(r"(?i)^back$").unwrap(),
        Regex::new(r"(?i)^PHOTOS$").unwrap(),
    ]
});

static LOW_QUALITY_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        Regex::new(r"^\W*$").unwrap(),          // Only punctuation/symbols
        Regex::new(r"^.{1,3}$").unwrap(),        // Too short (1-3 chars)
        Regex::new(r"^\d+$").unwrap(),           // Only numbers
        Regex::new(r"(?i)^[a-f0-9]{8,}$").unwrap(), // Hash-like strings
    ]
});

pub fn is_quality_title(title: &str) -> bool {
    let title = title.trim();

    // Must exist and be at least 4 characters
    if title.is_empty() || title.len() < 4 {
        return false;
    }

    // Check exclusion patterns
    for pattern in EXCLUSION_PATTERNS.iter() {
        if pattern.is_match(title) {
            return false;
        }
    }

    // Check low quality indicators
    for pattern in LOW_QUALITY_PATTERNS.iter() {
        if pattern.is_match(title) {
            return false;
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_titles() {
        assert!(is_quality_title("A Wonderful Film About Nature"));
        assert!(is_quality_title("Bach Cello Suite No. 1"));
        assert!(!is_quality_title("test"));
        assert!(!is_quality_title("IMG_2034"));
        assert!(!is_quality_title("ab"));
        assert!(!is_quality_title("12345"));
        assert!(!is_quality_title("abcdef1234abcd"));
        assert!(!is_quality_title("Screenshot_2024"));
        assert!(!is_quality_title(""));
    }
}
