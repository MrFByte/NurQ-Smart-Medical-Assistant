from dataclasses import dataclass
from pydantic import BaseModel
from app.models.domain import IntakeSession, FieldConfidence

@dataclass(frozen=True)
class FieldTarget:
    path: str       # e.g. "chief_complaint.summary"
    label: str      # human-readable, passed to question gen

INTAKE_FIELDS: list[FieldTarget] = [
    FieldTarget("chief_complaint.summary", "what brings you in today"),
    FieldTarget("chief_complaint.onset", "when this started"),
    FieldTarget("hpi.quality", "what it feels like"),
    FieldTarget("hpi.severity", "how severe it is on a scale of 0 to 10"),
    FieldTarget("hpi.timing_frequency", "how often it happens"),
    FieldTarget("hpi.provocation_palliation", "what makes it better or worse"),
    FieldTarget("hpi.radiation", "whether it spreads anywhere"),
    FieldTarget("medications", "current medications"),
    FieldTarget("allergies", "any allergies"),
    FieldTarget("pmh", "past medical history"),
    FieldTarget("social_history", "lifestyle and social history"),
    FieldTarget("family_history", "family medical history"),
    FieldTarget("ros", "any other symptoms"),
]

@dataclass(frozen=True)
class QuestionGroup:
    id: str
    label: str
    field_paths: list[str]

INTAKE_GROUPS: list[QuestionGroup] = [
    QuestionGroup("chief_complaint", "what brings you in today and when it started", ["chief_complaint.summary", "chief_complaint.onset"]),
    QuestionGroup("hpi_core", "how the symptom started and what it feels like", ["hpi.onset", "hpi.quality", "hpi.timing_frequency"]),
    QuestionGroup("severity", "severity and what makes it better or worse", ["hpi.severity", "hpi.provocation_palliation"]),
    QuestionGroup("radiation", "whether the symptom spreads anywhere else", ["hpi.radiation"]),
    QuestionGroup("medications", "current medications — name, dosage, how often, when last taken, and purpose", ["medications"]),
    QuestionGroup("allergies", "any allergies, what happens, and how severe", ["allergies"]),
    QuestionGroup("pmh", "past medical history — chronic conditions, surgeries, hospitalizations", ["pmh"]),
    QuestionGroup("social", "smoking, alcohol, occupation, and living situation", ["social_history"]),
    QuestionGroup("family", "any relevant family or hereditary conditions", ["family_history"]),
    QuestionGroup("ros", "anything else they'd like the doctor to know", ["ros"]),
]

class IntakeStateMachine:
    def next_target_group(self, session: IntakeSession) -> QuestionGroup | None:
        """Walk the group list, return first group where ANY field is unfilled."""
        for group in INTAKE_GROUPS:
            if any(self._is_unfilled(session, path) for path in group.field_paths):
                return group
        return None

    def count_remaining_groups(self, session: IntakeSession) -> int:
        """Count how many groups have at least one unfilled field."""
        count = 0
        for group in INTAKE_GROUPS:
            if any(self._is_unfilled(session, path) for path in group.field_paths):
                count += 1
        return count

    def next_target(self, session: IntakeSession) -> FieldTarget | None:
        """Walk the priority list, return first unfilled field."""
        for target in INTAKE_FIELDS:
            if self._is_unfilled(session, target.path):
                return target
        return None

    def is_complete(self, session: IntakeSession) -> bool:
        return self.next_target(session) is None

    def _is_unfilled(self, session: IntakeSession, path: str) -> bool:
        parts = path.split('.')
        current = session
        
        for part in parts:
            if hasattr(current, part):
                current = getattr(current, part)
            else:
                return True 

        # 1. ExtractedField
        if hasattr(current, "confidence"):
            return current.confidence in (FieldConfidence.UNASKED, FieldConfidence.PARTIAL)
        
        # 2. Lists (Medications, Allergies, etc)
        if isinstance(current, list):
            if len(current) > 0:
                return False
            # Check if we asked about this recently (to prevent infinite loops)
            target = next((t for t in INTAKE_FIELDS if t.path == path), None)
            if target and self._was_recently_asked(session, target.label):
                return False
            return True
            
        # 3. BaseModel groupings (SocialHistory, PastMedicalHistory, etc)
        if isinstance(current, BaseModel) and not hasattr(current, "confidence"):
            is_empty = True
            for f in type(current).model_fields.keys():
                val = getattr(current, f)
                if val is not None and val != [] and val != "":
                    is_empty = False
                    break
            
            if not is_empty:
                return False
                
            target = next((t for t in INTAKE_FIELDS if t.path == path), None)
            if target and self._was_recently_asked(session, target.label):
                return False
            return True

        # 4. Optional primitives
        if current is None:
            return True
            
        return False

    def _was_recently_asked(self, session: IntakeSession, label: str) -> bool:
        """Check if the assistant recently generated a question for this label to avoid infinite loops."""
        assistant_turns = [t for t in session.conversation_log if t.role == "assistant"]
        if not assistant_turns:
            return False
            
        last_turn = assistant_turns[-1]
        
        # Naive keyword matching to see if the LLM's last question was about this label
        stop_words = {"and", "any", "about", "your", "what", "how", "when", "on", "a", "scale", "of", "to"}
        keywords = [kw.lower() for kw in label.split() if kw.lower() not in stop_words]
        
        if not keywords:
            return False
            
        match_count = sum(1 for kw in keywords if kw in last_turn.content.lower())
        return match_count > 0
