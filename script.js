// script.js
// Logic for the Minimal Forms UI.
// Uses simple local state to demonstrate the UI flow, while providing 
// placeholder fetch() calls ready to be connected to a FastAPI backend.

/* =========================================
   1. STATE & MOCK DATA
   ========================================= */
let currentForm = null;          // Currently created / loaded form state
let allResponses = [];           // Stores submissions securely in mem
let questionIdCounter = 0;       // Unique IDs for builder UI

/* =========================================
   2. NAVIGATION LOGIC
   ========================================= */
function navigate(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected view
    document.getElementById(`view-${viewId}`).style.display = 'block';
    
    // Ensure the navigation button matches the state
    const navBtn = document.getElementById(`nav-${viewId}`);
    if (navBtn) navBtn.classList.add('active');

    // Handle view-specific renders if state exists
    if (viewId === 'fill-form') {
        renderFillForm();
    } else if (viewId === 'responses') {
        renderResponses();
    }
}

/* =========================================
   3. "CREATE FORM" BUILDER LOGIC
   ========================================= */

// Init: Ensure at least one question block exists when loaded
window.onload = () => {
    addQuestion();
};

function addQuestion() {
    questionIdCounter++;
    const qId = questionIdCounter;
    
    const container = document.getElementById('questions-container');
    
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';
    qBlock.id = `q-block-${qId}`;
    
    // Inject the inner elements dynamically
    qBlock.innerHTML = `
        <div class="q-header">
            <input type="text" placeholder="Question Text" class="q-text" id="q-text-${qId}">
            <select class="q-type" id="q-type-${qId}" onchange="toggleOptions(${qId})">
                <option value="text">Short Answer</option>
                <option value="mcq">Multiple Choice</option>
            </select>
        </div>
        
        <div class="options-container" id="q-options-${qId}" style="display: none;">
            <div id="options-list-${qId}"></div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addOption(${qId})" style="margin-top:8px; padding: 6px 12px; font-size: 0.85rem;">+ Add Option</button>
        </div>
        
        <div class="q-actions">
            <button type="button" class="btn btn-danger" onclick="deleteQuestion(${qId})">Delete</button>
        </div>
    `;
    
    container.appendChild(qBlock);
}

function deleteQuestion(id) {
    const el = document.getElementById(`q-block-${id}`);
    if (el) el.remove();
}

// Show/Hide multiple choice options based on Dropdown type selection
function toggleOptions(id) {
    const type = document.getElementById(`q-type-${id}`).value;
    const optionsContainer = document.getElementById(`q-options-${id}`);
    
    if (type === 'mcq') {
        optionsContainer.style.display = 'block';
        // Auto-add the first option if the list is empty
        const list = document.getElementById(`options-list-${id}`);
        if(list.children.length === 0) {
            addOption(id);
        }
    } else {
        optionsContainer.style.display = 'none';
        // We keep options in DOM for now, backend parser will ignore them if type='text'
    }
}

function addOption(qId) {
    const list = document.getElementById(`options-list-${qId}`);
    const optionId = Date.now(); // random unique local ID for option removal
    
    const optionRow = document.createElement('div');
    optionRow.className = 'option-row';
    optionRow.id = `option-${optionId}`;
    
    optionRow.innerHTML = `
        <input type="radio" disabled style="margin-right: 8px;">
        <input type="text" class="option-text" placeholder="Option Text">
        <button type="button" class="btn-icon" onclick="deleteOption('${optionId}')">×</button>
    `;
    
    list.appendChild(optionRow);
}

function deleteOption(optId) {
    const el = document.getElementById(`option-${optId}`);
    if (el) el.remove();
}

/* =========================================
   4. SAVE FORM & API PLACEHOLDERS
   ========================================= */

async function saveForm() {
    const title = document.getElementById('form-title').value;
    const desc = document.getElementById('form-desc').value;
    
    // Parse all dynamic input blocks
    const questionBlocks = document.querySelectorAll('.question-block');
    const questions = [];
    
    questionBlocks.forEach(block => {
        const idStr = block.id.replace('q-block-', '');
        const qText = document.getElementById(`q-text-${idStr}`).value;
        const qType = document.getElementById(`q-type-${idStr}`).value;
        
        const qObj = {
            id: `q-${Date.now()}-${idStr}`,
            text: qText || 'Untitled Question',
            type: qType,
            options: []
        };
        
        // If it's a multiple choice question, retrieve the specific texts
        if (qType === 'mcq') {
            const opts = block.querySelectorAll('.option-text');
            opts.forEach(o => {
                if(o.value) qObj.options.push(o.value);
            });
            // basic fallback
            if(qObj.options.length === 0) qObj.options.push("Option 1"); 
        }
        
        questions.push(qObj);
    });
    
    const payload = {
        title: title || 'Untitled Form',
        description: desc,
        questions: questions
    };

    // -----------------------------------------------------------------
    // API INTEGRATION POINT: POST /forms
    // -----------------------------------------------------------------
    /*
    try {
        const res = await fetch('http://localhost:8000/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("Form saved successfully to backend:", data);
    } catch(err) {
        console.error("Backend unavailable, falling back to local simulation logic.");
    }
    */
    
    // Set Local state for testing interface behavior
    currentForm = payload;
    alert("Form Saved locally! Switch to 'Fill Form' view to interact with it.");
}

/* =========================================
   5. "FILL FORM" LOGIC (PUBLIC VIEW)
   ========================================= */

async function loadFormForFilling(formId) {
    // -----------------------------------------------------------------
    // API INTEGRATION POINT: GET /forms/{id}
    // -----------------------------------------------------------------
    /*
    try {
        // e.g. GET form structure mapping
        const res = await fetch(`http://localhost:8000/api/forms/${formId}`);
        const data = await res.json();
        return data;
    } catch(err) {
        console.warn("Using local form state structure mask.");
        return currentForm;
    }
    */
    
    return currentForm; 
}

async function renderFillForm() {
    const container = document.getElementById('fill-form-container');
    
    const formToRender = await loadFormForFilling(1); // MOCK ID retrieval
    
    // UI State if no payload is found
    if (!formToRender) {
        container.innerHTML = `<div class="empty-state">No form available. Build and Save a form first!</div>`;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 2rem; margin-bottom: 8px;">${formToRender.title}</h2>
            <p style="color: var(--text-sec);">${formToRender.description.replace(/\n/g, '<br>')}</p>
        </div>
        <form id="public-fill-form" onsubmit="submitResponse(event)">
    `;
    
    formToRender.questions.forEach((q, index) => {
        html += `<div class="question-block" style="background-color: transparent;">
            <div style="font-weight: 500; margin-bottom: 12px; font-size: 1.05rem;">
                ${index + 1}. ${q.text}
            </div>
            <div class="q-input-area">
        `;
        
        if (q.type === 'text') {
            html += `<input type="text" name="${q.id}" required placeholder="Your answer" class="input-main" style="padding: 8px;">`;
        } else if (q.type === 'mcq') {
            q.options.forEach((opt, oIndex) => {
                html += `
                    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="${q.id}" value="${opt}" required>
                        <span>${opt}</span>
                    </label>
                `;
            });
        }
        
        html += `</div></div>`;
    });
    
    html += `
            <div style="margin-top: 24px;">
                <button type="submit" class="btn btn-primary">Submit Response</button>
            </div>
        </form>
    `;
    
    container.innerHTML = html;
}

async function submitResponse(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const answers = [];
    
    // We already have currentForm structure logic to map IDs gracefully for readability
    currentForm.questions.forEach(q => {
        const storedValue = formData.get(q.id);
        if (storedValue !== null) {
            answers.push({
                questionId: q.id,
                questionText: q.text,
                answerValue: storedValue
            });
        }
    });
    
    const payload = {
        answers: answers,
        submittedAt: new Date().toISOString()
    };
    
    // -----------------------------------------------------------------
    // API INTEGRATION POINT: POST /forms/{id}/submit
    // -----------------------------------------------------------------
    /*
    try {
        const res = await fetch(`http://localhost:8000/api/forms/1/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
    } catch(err) {
        console.warn("Backend failover to local push hook.");
    }
    */
    
    allResponses.push(payload);
    alert('Response submitted successfully! You can view it in the Responses tab.');
    e.target.reset(); 
}

/* =========================================
   6. RESPONSES DASHBOARD LOGIC
   ========================================= */

async function fetchResponses(formId) {
    // -----------------------------------------------------------------
    // API INTEGRATION POINT: GET /forms/{id}/responses
    // -----------------------------------------------------------------
    /*
    try {
        const res = await fetch(`http://localhost:8000/api/forms/${formId}/responses`);
        const data = await res.json();
        return data; 
    } catch(err) {
        return allResponses;
    }
    */
   return allResponses;
}

async function renderResponses() {
    const container = document.getElementById('responses-container');
    const responses = await fetchResponses(1); // MOCK Form ID grouping trigger
    
    let html = `<h2>Responses (${responses.length})</h2>`;
    
    if (responses.length === 0) {
        html += `<div class="empty-state">No responses yet. Switch to Fill Form to submit one!</div>`;
        container.innerHTML = html;
        return;
    }
    
    responses.forEach((resp, idx) => {
        const friendlyDate = new Date(resp.submittedAt).toLocaleString();
        html += `
            <div class="submission-card">
                <div style="font-size: 0.85rem; color: var(--text-sec); margin-bottom: 12px;">Submission #${idx + 1} • ${friendlyDate}</div>
        `;
        
        resp.answers.forEach(ans => {
            html += `
                <div class="answer-row">
                    <div class="answer-q">${ans.questionText}</div>
                    <div class="answer-a">${ans.answerValue}</div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}
