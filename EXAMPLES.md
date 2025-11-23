# Example Use Cases

## Example 1: Software Engineer Application

### Setup

Documents in `data/documents/`:
- `resume.pdf` - Software engineer resume
- `cover_letter.docx` - Generic cover letter
- `projects.txt` - Detailed project descriptions

### Workflow

```bash
# Ingest documents
python main.py ingest

# Start filling application
python main.py fill --interactive
```

### Sample Questions & Answers

**Question:** "Describe your experience with Python"

**Generated Answer:**
> "I have 5 years of professional experience with Python, including developing RESTful APIs using Flask and FastAPI, data analysis with pandas and numpy, and building machine learning models with scikit-learn and TensorFlow. In my recent role at XYZ Corp, I led a team that built a recommendation system serving 100K+ daily users."

**Confidence:** 92%

---

**Question:** "Why do you want to work here?"

**Generated Answer:**
> "I am excited about the opportunity to work on cutting-edge AI technology and contribute to building products that impact millions of users. My background in machine learning and scalable systems aligns well with your team's focus on AI-driven solutions."

**Confidence:** 78%

**Action:** Edited to mention specific company product

---

**Question:** "Years of experience?" (Dropdown)

**Options:** [0-1, 1-3, 3-5, 5-10, 10+]

**Generated Answer:** "5-10"

**Confidence:** 95%

**Action:** Auto-filled

## Example 2: First-Time User

### Step-by-Step

```bash
# 1. Check status
> python main.py status

=== System Status ===

✓ Configuration file loaded
✓ Gemini API key configured
✓ Documents directory: 3 file(s)
⚠ Vector store: 0 documents, 0 answers

# 2. Ingest documents
> python main.py ingest

=== Document Ingestion ===

Found 3 document(s) to process:
  - resume.pdf
  - cover_letter.docx
  - portfolio.txt

Processing documents...
Ingesting: resume.pdf
  ✓ Extracted 12 chunks
Ingesting: cover_letter.docx
  ✓ Extracted 5 chunks
Ingesting: portfolio.txt
  ✓ Extracted 8 chunks

✓ Total chunks created: 25

Loading embedding model: all-MiniLM-L6-v2
✓ Loaded existing collection: documents
Adding 25 chunks to vector store...
Generating embeddings...
100%|████████████████████| 25/25
✓ Added 25 chunks to vector store

✓ Ingestion complete!
Total documents in database: 25

# 3. Test search
> python main.py search "education"

=== Searching: 'education' ===

--- Result 1 (Similarity: 89%) ---
Source: resume.pdf
Section: Education
Text: Master of Science in Computer Science, Stanford University, 2018-2020. Focused on Machine Learning and Artificial Intelligence. GPA: 3.9/4.0...

--- Result 2 (Similarity: 76%) ---
Source: resume.pdf
Section: Education
Text: Bachelor of Science in Computer Science, UC Berkeley, 2014-2018. Relevant coursework: Data Structures, Algorithms, Database Systems...

# 4. Fill application
> python main.py fill --interactive

=== Job Application Filler ===

Initializing components...
✓ Initialized Gemini model: gemini-1.5-flash

Launching browser...
Navigate to the job application page, then press ENTER here.

Press ENTER when you're on the application page...
[User navigates to job site and presses ENTER]

Detecting form fields...
✓ Detected 8 form fields

============================================================
Field 1/8
Type: text
Label: Full Name

Generating answer...

Generated Answer: John Smith
Confidence: 95%

[F] Fill  [E] Edit  [S] Skip  [Q] Quit
Your choice: f
✓ Filled

============================================================
Field 2/8
Type: email
Label: Email Address

Generating answer...

Generated Answer: john.smith@email.com
Confidence: 95%

[F] Fill  [E] Edit  [S] Skip  [Q] Quit
Your choice: f
✓ Filled

...
```

## Example 3: Handling Different Field Types

### Text Field

**HTML:**
```html
<label>Tell us about yourself</label>
<input type="text" name="about">
```

**Detection:**
- Type: text
- Label: "Tell us about yourself"

**Generation:**
Uses full context from resume to generate a concise summary.

### Dropdown/Select

**HTML:**
```html
<label>Highest Education</label>
<select name="education">
  <option>High School</option>
  <option>Bachelor's Degree</option>
  <option>Master's Degree</option>
  <option>PhD</option>
</select>
```

**Detection:**
- Type: select
- Options: ["High School", "Bachelor's Degree", "Master's Degree", "PhD"]

**Generation:**
Searches resume for education information, matches to closest option.

### Radio Buttons

**HTML:**
```html
<fieldset>
  <legend>Are you authorized to work in the US?</legend>
  <label><input type="radio" name="work_auth" value="yes"> Yes</label>
  <label><input type="radio" name="work_auth" value="no"> No</label>
</fieldset>
```

**Detection:**
- Type: radio
- Label: "Are you authorized to work in the US?"
- Options: ["Yes", "No"]

**Generation:**
Boolean reasoning based on context, selects appropriate option.

### Textarea

**HTML:**
```html
<label>Why are you interested in this position?</label>
<textarea name="interest" rows="5"></textarea>
```

**Detection:**
- Type: textarea
- Label: "Why are you interested in this position?"

**Generation:**
Generates longer, multi-sentence response based on context.

## Example 4: Managing Answer History

```bash
# View recent answers
> python main.py history --recent 5

=== Answer History ===

--- Entry 1 ---
Question: Full Name?
Answer: John Smith
Type: text | Confidence: 95%

--- Entry 2 ---
Question: Email Address?
Answer: john.smith@email.com
Type: email | Confidence: 95%

--- Entry 3 ---
Question: Years of experience?
Answer: 5-10
Type: select | Confidence: 92%

--- Entry 4 ---
Question: Why do you want to work here?
Answer: I am passionate about building scalable systems...
Type: textarea | Confidence: 82%
(Edited by user)

--- Entry 5 ---
Question: Are you authorized to work in the US??
Answer: Yes
Type: radio | Confidence: 90%

# View statistics
> python main.py history --stats

=== Answer History ===

Total entries: 47
Edited answers: 8
Average confidence: 87%

Field types:
  text: 15
  select: 12
  textarea: 10
  radio: 6
  checkbox: 4
```

## Example 5: Troubleshooting Low Confidence

### Scenario: Poor answer for "Describe your leadership experience"

```bash
# Check what context was found
> python main.py search "leadership experience"

=== Searching: 'leadership experience' ===

--- Result 1 (Similarity: 45%) ---
Source: resume.pdf
Section: Experience
Text: Worked on a team of 5 engineers...

# Low similarity! Need better content

# Solution: Add leadership details to resume
# Edit resume.pdf to include:
# "Led a team of 8 engineers in developing..."
# "Mentored 3 junior developers..."
# "Managed project timeline and stakeholder communication..."

# Re-ingest
> python main.py ingest --rebuild

# Try again
> python main.py search "leadership experience"

--- Result 1 (Similarity: 89%) ---
Source: resume.pdf
Section: Experience
Text: Led a team of 8 engineers in developing a microservices architecture...
```

## Example 6: Batch Mode (Advanced)

**Use case:** Filling multiple similar applications quickly

```bash
# Use batch mode for auto-fill
> python main.py fill --batch

=== Job Application Filler ===

[Browser opens]
[Navigate to application]
[Press ENTER]

Detecting form fields...
✓ Detected 15 form fields

Field 1/15: Full Name
✓ Filled

Field 2/15: Email
✓ Filled

Field 3/15: Phone
✓ Filled

... [auto-fills all fields] ...

✓ Processing complete!
Filled 15/15 fields

Please review the form and submit manually.
```

**Warning:** Review all fields before submitting in batch mode!

## Example 7: Multi-Document Context

### Documents:
- `resume.pdf` - Work experience and education
- `cover_letter.docx` - Why you're interested
- `projects.md` - Detailed project descriptions
- `certifications.pdf` - AWS, Kubernetes certs

### Question: "Describe your cloud experience"

**Retrieved Context:**
1. From `resume.pdf`: "Deployed applications on AWS EC2, S3, Lambda..."
2. From `projects.md`: "Built a microservices platform on Kubernetes..."
3. From `certifications.pdf`: "AWS Solutions Architect - Associate (2022)..."

**Generated Answer:**
> "I have extensive cloud experience, primarily with AWS where I've deployed production applications using EC2, S3, Lambda, and RDS. I built a microservices platform on Kubernetes that handles 50K requests/day. I hold the AWS Solutions Architect Associate certification and regularly work with CloudFormation for infrastructure as code."

**Confidence:** 94%

All three documents contributed to a comprehensive answer!

## Tips for Different Job Types

### Software Engineering
- Include programming languages, frameworks
- Mention specific projects with metrics
- Add GitHub/portfolio links in documents

### Data Science
- Emphasize ML frameworks, statistics
- Include dataset sizes, model performance
- Mention publications, Kaggle competitions

### Product Management
- Focus on product launches, metrics
- Include stakeholder management examples
- Add user research, A/B testing experience

### Design
- Mention design tools, processes
- Include portfolio projects
- Add user testing, accessibility work

## Common Patterns

### Pattern 1: Name & Contact Info
- Detected quickly
- Very high confidence (95%+)
- Rarely needs editing

### Pattern 2: Experience Questions
- Moderate confidence (75-85%)
- May need editing for specificity
- Benefits from detailed resume

### Pattern 3: Motivation Questions
- Lower confidence (70-80%)
- Often edited to be more specific
- Combines multiple document sources

### Pattern 4: Yes/No Questions
- High confidence (85-95%)
- Usually correct
- Boolean logic works well

