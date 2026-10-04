import { describe, expect, it } from 'vitest';
import { splitSentences } from './sentences';

describe('splitSentences', () => {
  it('joins printed lines and splits at sentence ends, keeping closing quotes with their sentence', () => {
    expect(
      splitSentences(['सुबह कह रही थी, “मैं दिन की शुरुआत करती हूँ। सबको', 'नींद से जगाती हूँ। सब अपने-अपने काम पर जाते हैं।”', 'दोपहर अपने को बढ़िया']),
    ).toEqual([
      'सुबह कह रही थी, “मैं दिन की शुरुआत करती हूँ।',
      'सबको नींद से जगाती हूँ।',
      'सब अपने-अपने काम पर जाते हैं।”',
      'दोपहर अपने को बढ़िया',
    ]);
  });

  it('handles Kannada full stops, questions and brackets', () => {
    expect(splitSentences(['(ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ ವಾಸ', 'ಮಾಡುತ್ತಿದ್ದರು. ಅಷ್ಟರಲ್ಲಿ ಸೇತು ಓಡಿ', 'ಬಂದ.)'])).toEqual([
      '(ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ ವಾಸ ಮಾಡುತ್ತಿದ್ದರು.',
      'ಅಷ್ಟರಲ್ಲಿ ಸೇತು ಓಡಿ ಬಂದ.)',
    ]);
  });

  it('keeps short exclamations and numbering with the next sentence, and does not split at an ellipsis', () => {
    expect(splitSentences(['ಸೇತು: ಏ! ಬಾಲು, ಕೊಡೋ, ಅದು ನನ್ನ ಹಣ್ಣು.'])).toEqual(['ಸೇತು: ಏ! ಬಾಲು, ಕೊಡೋ, ಅದು ನನ್ನ ಹಣ್ಣು.']);
    expect(splitSentences(['೩. ಹಂಚಿ ತಿನ್ನೋಣ (ಕಿರು ನಾಟಕ)'])).toEqual(['೩. ಹಂಚಿ ತಿನ್ನೋಣ (ಕಿರು ನಾಟಕ)']);
    expect(splitSentences(['ಸೇತು: ಅದು........ ಅದು ನಿಮ್ಮ ಹಿತ್ತಿಲಲ್ಲಿ.'])).toEqual(['ಸೇತು: ಅದು........ ಅದು ನಿಮ್ಮ ಹಿತ್ತಿಲಲ್ಲಿ.']);
  });

  it('never loses or changes a character other than whitespace', () => {
    const lines = ['बच्चों से पूछें कि वे सुबह, शाम और रात को', 'कौन-कौन से कार्य करते हैं। उनसे सवाल करें कि हर', 'काम उचित समय पर न करने का क्या परिणाम हो', 'सकता है।'];
    expect(splitSentences(lines).join('').replace(/\s/g, '')).toBe(lines.join('').replace(/\s/g, ''));
  });
});
