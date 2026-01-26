import { GoogleGenAI, Type } from "@google/genai";
import { ProjectDetail, DailyLog, SmartUpdate, RiskAnalysis, ProjectDraft, DailyUpdateAnalysis } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generateExecutiveRiskAnalysis = async (project: ProjectDetail): Promise<string> => {
    const ai = getClient();
    if (!ai) {
        return "Gemini API Key not configured. Unable to generate analysis.";
    }

    const prompt = `
    Role: Senior PMO Analyst.
    Task: Analyze the following project data and provide a concise, 2-sentence executive risk assessment.
    
    Project: ${project.name}
    Current Status: ${project.status}
    Budget Consumed: ${project.budget_consumed_percent}%
    
    Latest Update:
    "${project.updates[0]?.summary_text || 'No recent updates'}"
    
    Reported Risks:
    "${project.updates[0]?.risks_blockers || 'None'}"
    
    Format:
    [Risk Level]: [Assessment]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "No analysis generated.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Failed to generate analysis due to an API error.";
    }
};

export const generateDailyLog = async (
    projectName: string,
    status: string,
    progress: string,
    blockers: string,
    helpNeeded: boolean
): Promise<DailyLog | null> => {
    const ai = getClient();
    if (!ai) return null;

    const prompt = `
You are a PMO assistant.

Summarize today's project update into a structured daily log.

Input:
- Project name: ${projectName}
- Status today: ${status}
- Progress note: ${progress}
- Blockers: ${blockers}
- Help needed: ${helpNeeded ? 'Yes' : 'No'}

Rules:
- If blockers exist, risk_signal cannot be 'none'
- Keep language concise and executive-readable
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        update_date: { type: Type.STRING, description: "YYYY-MM-DD" },
                        status_today: { type: Type.STRING },
                        progress_note: { type: Type.STRING },
                        blocker_today: { type: Type.STRING },
                        help_needed: { type: Type.BOOLEAN },
                        risk_signal: { 
                            type: Type.STRING, 
                            description: "must be one of: none, emerging, critical" 
                        },
                    },
                    required: ["update_date", "status_today", "progress_note", "blocker_today", "help_needed", "risk_signal"],
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as DailyLog;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error (Daily Log):", error);
        return null;
    }
};

export const generateMondayBriefing = async (projects: ProjectDetail[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "<p>Gemini API Key not configured.</p>";

    // Prepare data context
    const projectsContext = projects.map(p => {
        const previousStatus = p.updates[1]?.rag_status || 'Unknown';
        const currentStatus = p.status;
        const statusChanged = previousStatus !== 'Unknown' && previousStatus !== currentStatus;
        
        return `
        Project: ${p.name}
        Current Status: ${currentStatus}
        Previous Status (1 week ago): ${previousStatus}
        Status Changed: ${statusChanged ? 'YES' : 'NO'}
        Latest Summary: ${p.updates[0]?.summary_text || 'No updates'}
        Latest Risks: ${p.updates[0]?.risks_blockers || 'None'}
        Owner: ${p.owner.name}
        `;
    }).join('\n---\n');

    const prompt = `
    You are a PMO executive reporting assistant.

    Input Data (Daily updates from past 7 days aggregated):
    ${projectsContext}

    Goal: Generate an executive-level PMO summary using the last 7 days of daily updates.

    Focus on:
    - Status changes
    - Risk escalation
    - Projects needing decision

    Output Structure (Return pure HTML with Tailwind CSS):

    1. **Portfolio Health Overview**:
       - A summary section highlighting the overall health trend.
       - Use a large headline style.

    2. **Table of Critical Projects**:
       - A proper HTML table listing projects that are At Risk, Delayed, or recently changed status.
       - Columns: Project Name, Status (use distinct colors), Risk/Escalation Details, Action Owner.
       - Table styling: clean, borders, standard executive report look.

    3. **Recommended Actions**:
       - A clear list of decisions or approvals needed from the executive team.
       - Style as a call-to-action box.

    Design Constraints:
    - Use Tailwind CSS classes.
    - No markdown formatting (like \`\`\`), just the HTML string.
    - Ensure contrast and readability.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "<p>No briefing generated.</p>";
    } catch (error) {
        console.error("Gemini API Error (Monday Briefing):", error);
        return "<p>Failed to generate briefing.</p>";
    }
};

// Now processes with the specific PMO daily update assistant rules
export const processDataIngestion = async (rawText: string, projects: {id: string, name: string}[]): Promise<SmartUpdate | null> => {
    const ai = getClient();
    if (!ai) return null;

    // Use the exact prompt structure requested, injected with project context for better name identification
    const prompt = `
    You are a PMO daily update assistant.

    Context - Known Projects:
    ${JSON.stringify(projects.map(p => p.name))}

    Input:
    "${rawText}"
    (Free-text project update written by a human, Thai language or informal allowed)

    Your tasks:
    1. Identify the project name (match with Known Projects if possible)
    2. Summarize progress in executive-readable language
    3. Detect blockers, dependencies, or delays
    4. Infer project status: on_track, at_risk, or delayed
    5. Extract any mentioned deadline or target date

    Rules:
    - If some users or stakeholders are not completed, status cannot be on_track
    - If work is waiting on an external factor (e.g. election, third party), status must be at_risk
    - Meetings alone do not count as progress
    - Keep progress_note concise (max 2 sentences)
    - If no blocker exists, set blocker_today to null
    - If no target date is mentioned, set target_date to null
    - Do not include any explanation outside JSON

    Output format (STRICT JSON ONLY):
    {
      "project_name": "",
      "status_today": "on_track | at_risk | delayed",
      "progress_note": "",
      "blocker_today": "",
      "target_date": "YYYY-MM-DD or null"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        project_name: { type: Type.STRING },
                        status_today: { type: Type.STRING, enum: ["on_track", "at_risk", "delayed"] },
                        progress_note: { type: Type.STRING },
                        blocker_today: { type: Type.STRING, nullable: true },
                        target_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD format" }
                    },
                    required: ["project_name", "status_today", "progress_note", "blocker_today", "target_date"],
                }
            }
        });

        if (response.text) {
            // Clean potentially markdown-wrapped JSON
            let cleanText = response.text.trim();
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            
            const result = JSON.parse(cleanText);
            
            // Post-process to match SmartUpdate interface expected by UI
            const matchedProject = projects.find(p => 
                p.name.toLowerCase().includes(result.project_name.toLowerCase()) || 
                result.project_name.toLowerCase().includes(p.name.toLowerCase())
            );

            const smartUpdate: SmartUpdate = {
                project_id: matchedProject ? matchedProject.id : undefined,
                project_name: result.project_name,
                update_date: new Date().toISOString().split('T')[0],
                status_today: result.status_today,
                progress_note: result.progress_note,
                blocker_today: result.blocker_today,
                target_date: result.target_date,
                // Derived fields to satisfy SmartUpdate interface
                help_needed: result.status_today !== 'on_track',
                risk_signal: result.status_today === 'delayed' ? 'critical' : (result.status_today === 'at_risk' ? 'emerging' : 'none'),
                confidence_level: 'high' 
            };
            
            return smartUpdate;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error (Data Ingestion):", error);
        return null;
    }
};

export const analyzeRiskPattern = async (projectName: string, logs: DailyLog[]): Promise<RiskAnalysis | null> => {
    const ai = getClient();
    if (!ai) return null;

    const prompt = `
    You are a PMO risk monitoring assistant.

    Analyze daily project updates over the last 3 days for project: "${projectName}".

    Input Data (Daily Logs):
    ${JSON.stringify(logs, null, 2)}

    Objectives:
    - Detect early risk patterns
    - Escalate when necessary

    Rules:
    - If status is at_risk for 2 consecutive days → escalate to critical
    - If blockers persist more than 3 days → flag executive attention
    - If help_needed is true → include in decision queue

    Output must be valid JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        project_name: { type: Type.STRING },
                        risk_trend: { type: Type.STRING, enum: ["stable", "worsening", "improving"] },
                        escalation_required: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING }
                    },
                    required: ["project_name", "risk_trend", "escalation_required", "reason"],
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as RiskAnalysis;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error (Risk Pattern):", error);
        return null;
    }
};

export const extractNewProjectFromText = async (rawText: string): Promise<ProjectDraft | null> => {
    const ai = getClient();
    if (!ai) return null;

    // Strict prompt from user requirements
    const prompt = `
    You are an assistant for a PMO tracking system.

    The user will describe a project in plain text (Thai or English).
    Your job is to extract structured project information.

    Rules:
    - Do NOT invent information.
    - If a field is not mentioned, return null.
    - Output JSON only. No explanation.

    Fields:
    - project_name (string, required)
    - project_type (string or null, e.g. 'Digital', 'Training', 'Internal', 'Other') 
    - owner (string or null)
    - target_date (ISO date string YYYY-MM-DD or null)

    Input:
    "${rawText}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        project_name: { type: Type.STRING },
                        project_type: { type: Type.STRING, nullable: true },
                        owner: { type: Type.STRING, nullable: true },
                        target_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD" },
                    },
                    required: ["project_name", "project_type", "owner", "target_date"],
                }
            }
        });

        if (response.text) {
            const raw = JSON.parse(response.text);
            
            // Map to valid ProjectDraft type (Handling defaults)
            const draft: ProjectDraft = {
                project_name: raw.project_name || "Untitled Project",
                project_type: (['Digital', 'Training', 'Internal', 'Other'].includes(raw.project_type) ? raw.project_type : 'Other'),
                owner: raw.owner,
                target_date: raw.target_date,
                initial_status: 'On Track' // Default as per requirements implied in previous steps
            };
            
            return draft;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error (Project Extraction):", error);
        return null;
    }
};

export const analyzeDailyProjectUpdate = async (
    projectId: string,
    projectName: string,
    currentStatus: string,
    rawText: string
): Promise<DailyUpdateAnalysis | null> => {
    const ai = getClient();
    if (!ai) return null;

    const prompt = `
    Role: PMO Daily Update Assistant.
    
    Task: Analyze a daily update for an existing project.
    
    Context:
    - Project ID: ${projectId}
    - Project Name: "${projectName}"
    - Current Status: "${currentStatus}"
    
    Input Text: "${rawText}"
    (User input in Thai or English)
    
    Requirements:
    1. status_today: Determine if the project is On Track, At Risk, Delayed, or Completed.
       - If explicit in text, use it.
       - If blockers/delays mentioned, downgrade status.
       - If not mentioned/unclear, default to "${currentStatus}".
    2. progress_note: Summarize work done in Thai. Professional, concise (max 2 sentences).
    3. blocker_today: Extract blockers. Return null if none.
    4. target_date: If a new completion date is mentioned, return YYYY-MM-DD. Else null.
    
    Constraint:
    - Return STRICT JSON.
    - Do not hallucinate blockers.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        project_id: { type: Type.STRING },
                        status_today: { type: Type.STRING, enum: ['On Track', 'At Risk', 'Delayed', 'Completed'] },
                        progress_note: { type: Type.STRING },
                        blocker_today: { type: Type.STRING, nullable: true },
                        target_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD" }
                    },
                    required: ["project_id", "status_today", "progress_note", "blocker_today", "target_date"],
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as DailyUpdateAnalysis;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error (Daily Update Analysis):", error);
        return null;
    }
};