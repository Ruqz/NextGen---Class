import { NotificationEventType, NotificationChannel, NotificationTemplate } from '../../types';

export const DEFAULT_NOTIFICATION_TEMPLATES: Array<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
  // 1. Application Received
  {
    event: 'application_received',
    channel: 'EMAIL',
    name: 'Application Received Confirmation',
    description: 'Sent immediately when an applicant submits an admission application for a cohort.',
    subject: 'Application Received: {{programmeName}} ({{cohortName}}) — NextGen Class',
    bodyText: `Dear {{recipientName}},

Thank you for applying to NextGen Class for {{programmeName}} — {{cohortName}}!

We have successfully received your application (Reference ID: {{applicationId}}). Our admissions committee is currently reviewing your submission against the cohort selection criteria.

Application Summary:
• Programme: {{programmeName}}
• Target Cohort: {{cohortName}}
• Submission Date: {{submissionDate}}
• Status: Under Review

You can track your application status anytime at:
{{actionUrl}}

If you have any questions, feel free to reply to this email.

Best regards,
NextGen Class Admissions Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .header { background: #ea580c; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .card { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .card-title { font-weight: 700; color: #9a3412; font-size: 13px; text-transform: uppercase; margin-bottom: 8px; }
  .btn { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p>NextGen Class Admissions</p>
      <h1>Application Acknowledged</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Thank you for submitting your application to the <strong>{{programmeName}}</strong> for <strong>{{cohortName}}</strong>.</p>
      
      <div class="card">
        <div class="card-title">Submission Details</div>
        <div><strong>Application Ref:</strong> {{applicationId}}</div>
        <div><strong>Programme:</strong> {{programmeName}}</div>
        <div><strong>Cohort:</strong> {{cohortName}}</div>
        <div><strong>Submitted On:</strong> {{submissionDate}}</div>
        <div><strong>Review Status:</strong> <span style="color: #ea580c; font-weight: 700;">Under Review</span></div>
      </div>

      <p>Our admissions committee evaluates applications on a rolling basis. You will receive an update once the initial qualification check is complete.</p>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Track Application Status</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
      <p>Need support? Contact <a href="mailto:admissions@nextgenclass.org" style="color: #ea580c;">admissions@nextgenclass.org</a></p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `*NextGen Class Admissions* 🎓
Hello *{{recipientName}}*, we have received your application for *{{programmeName}}* ({{cohortName}}).

*Ref ID:* {{applicationId}}
*Status:* Under Review

Track your real-time admission progress here:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'applicationId', 'submissionDate', 'actionUrl'],
    isActive: true,
  },

  // 2. Qualified
  {
    event: 'qualified',
    channel: 'EMAIL',
    name: 'Eligibility Qualification Notice',
    description: 'Sent when an applicant passes the preliminary eligibility screening.',
    subject: 'You are Eligible: {{programmeName}} Next Steps — NextGen Class',
    bodyText: `Dear {{recipientName}},

Great news! Your application for {{programmeName}} ({{cohortName}}) has been verified and marked as QUALIFIED.

Your profile meets the prerequisite criteria for this cohort session. You are now progressing to the technical readiness & pre-admission assessment stage.

Next Step:
Please look out for your Pre-Admission Assessment Invitation. You can also view details in your applicant tracker:
{{actionUrl}}

Congratulations on passing this first milestone!

Best regards,
NextGen Class Admissions Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #059669; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .badge { display: inline-block; background: #d1fae5; color: #065f46; font-weight: 700; padding: 6px 12px; border-radius: 6px; font-size: 12px; margin: 8px 0; }
  .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p>NextGen Class Admissions</p>
      <h1>Application Qualified</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>We are pleased to inform you that your application for <strong>{{programmeName}}</strong> (<strong>{{cohortName}}</strong>) has successfully cleared initial screening.</p>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <span class="badge">STATUS: ELIGIBLE & QUALIFIED</span>
        <p style="margin: 8px 0 0; font-size: 13px; color: #166534;">Your background and readiness profile fulfill our cohort entry requirements. Your application has advanced to the pre-admission testing phase.</p>
      </div>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">View Next Steps in Portal</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `*NextGen Class Admissions* ✅
Congratulations *{{recipientName}}*! Your application for *{{programmeName}}* ({{cohortName}}) has been verified as *QUALIFIED*.

You have advanced to the Pre-Admission Assessment stage. View your next steps:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'actionUrl'],
    isActive: true,
  },

  // 3. Assessment Invitation
  {
    event: 'assessment_invitation',
    channel: 'EMAIL',
    name: 'Pre-Admission Assessment Invitation',
    description: 'Sent with invitation token and access link for pre-admission testing.',
    subject: 'Pre-Admission Assessment Invitation: {{assessmentTitle}} — NextGen Class',
    bodyText: `Dear {{recipientName}},

You have been invited to take the official Pre-Admission Assessment for {{programmeName}} ({{cohortName}}).

Assessment Details:
• Title: {{assessmentTitle}}
• Duration: {{durationMinutes}} Minutes
• Pass Threshold: {{passThreshold}}%
• Deadline: {{deadline}}
• Access Token: {{token}}

Please take the test in a quiet environment with a stable internet connection.

Start your assessment here:
{{actionUrl}}

Best of luck!
NextGen Class Admissions Board`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #2563eb; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .token { font-family: monospace; font-weight: 700; font-size: 16px; color: #1d4ed8; background: #ffffff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
  .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Technical Readiness Test</p>
      <h1>Pre-Admission Assessment Invitation</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>You are invited to complete the technical aptitude assessment for <strong>{{programmeName}}</strong> — <strong>{{cohortName}}</strong>.</p>
      
      <div class="card">
        <div><strong>Assessment:</strong> {{assessmentTitle}}</div>
        <div><strong>Time Limit:</strong> {{durationMinutes}} Minutes</div>
        <div><strong>Pass Score:</strong> {{passThreshold}}%</div>
        <div><strong>Due Date:</strong> {{deadline}}</div>
        <div style="margin-top: 8px;"><strong>Access Token:</strong><br><span class="token">{{token}}</span></div>
      </div>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Take Assessment Now</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `*NextGen Class Pre-Admission Test* 📝
Hi *{{recipientName}}*, you are invited to take the *{{assessmentTitle}}* for *{{programmeName}}* ({{cohortName}}).

⏱ *Duration:* {{durationMinutes}} mins
🎯 *Pass Score:* {{passThreshold}}%
📅 *Deadline:* {{deadline}}
🔑 *Token:* {{token}}

Click below to begin your test:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'assessmentTitle', 'durationMinutes', 'passThreshold', 'deadline', 'token', 'actionUrl'],
    isActive: true,
  },

  // 4. Assessment Reminder
  {
    event: 'assessment_reminder',
    channel: 'EMAIL',
    name: 'Assessment Pending Reminder',
    description: 'Sent to remind applicants of an impending assessment deadline.',
    subject: 'Action Required: Assessment Deadline Approaching — {{assessmentTitle}}',
    bodyText: `Dear {{recipientName}},

This is a gentle reminder that your Pre-Admission Assessment for {{programmeName}} is pending.

Assessment: {{assessmentTitle}}
Deadline: {{deadline}}
Access Token: {{token}}

Completing this assessment is mandatory to receive an admission decision for {{cohortName}}.

Start now:
{{actionUrl}}

NextGen Class Admissions Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #d97706; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .alert-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; color: #92400e; }
  .btn { display: inline-block; background: #d97706; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Deadline Alert</p>
      <h1>Pre-Admission Assessment Reminder</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Your assessment for <strong>{{programmeName}}</strong> (<strong>{{cohortName}}</strong>) is closing soon.</p>
      
      <div class="alert-box">
        <div><strong>Assessment:</strong> {{assessmentTitle}}</div>
        <div><strong>Final Deadline:</strong> {{deadline}}</div>
        <div><strong>Token:</strong> <code>{{token}}</code></div>
      </div>

      <p>Please complete this step to avoid cancellation of your cohort application.</p>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Complete Assessment Now</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `*Reminder: Assessment Pending* ⏰
Hi *{{recipientName}}*, please remember to complete your *{{assessmentTitle}}* for *{{programmeName}}*.

*Due Date:* {{deadline}}
*Token:* {{token}}

Take the test now:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'assessmentTitle', 'deadline', 'token', 'actionUrl'],
    isActive: true,
  },

  // 5. Acceptance
  {
    event: 'acceptance',
    channel: 'EMAIL',
    name: 'Official Admission Acceptance & Offer',
    description: 'Sent when an applicant is officially accepted into a cohort.',
    subject: 'Congratulations! Admission Offer for {{programmeName}} ({{cohortName}})',
    bodyText: `Dear {{recipientName}},

Congratulations! On behalf of the NextGen Class Admissions Board, we are thrilled to offer you official admission into {{programmeName}} — {{cohortName}}.

Your application and assessment scores demonstrated exceptional drive and aptitude.

Offer Summary:
• Programme: {{programmeName}}
• Cohort: {{cohortName}}
• Start Date: {{startDate}}
• Status: Offer Ready to Enrol

To secure your seat and activate your Learner Dashboard, please accept your admission offer here:
{{actionUrl}}

Welcome to NextGen Class!

Warm regards,
Office of Admissions`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ea580c; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 32px; color: #ffffff; text-align: center; }
  .header h1 { margin: 8px 0 0; font-size: 24px; font-weight: 800; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .offer-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 6px -1px rgba(5,150,105,0.3); }
  .footer { background: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">Official Admission Offer</div>
      <h1>Congratulations, {{recipientName}}!</h1>
    </div>
    <div class="content">
      <p>We are delighted to formally offer you admission into <strong>{{programmeName}}</strong> — <strong>{{cohortName}}</strong>.</p>
      
      <div class="offer-box">
        <div style="font-weight: 700; color: #166534; font-size: 14px; margin-bottom: 8px;">ADMISSION DETAILS</div>
        <div><strong>Programme:</strong> {{programmeName}}</div>
        <div><strong>Cohort Session:</strong> {{cohortName}}</div>
        <div><strong>Commencement Date:</strong> {{startDate}}</div>
        <div><strong>Admission Status:</strong> <span style="color: #059669; font-weight: 700;">OFFER CONFIRMED</span></div>
      </div>

      <p>Please review and accept your offer letter to initialize your student credentials, access course schedules, and enter the Learner Portal.</p>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Accept Offer & Complete Enrolment</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `🎉 *Congratulations {{recipientName}}!*
You have been officially admitted into *{{programmeName}}* ({{cohortName}})!

*Start Date:* {{startDate}}
*Status:* Offer Confirmed

Click below to review your official acceptance letter and activate your Learner Hub:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'startDate', 'actionUrl'],
    isActive: true,
  },

  // 6. Rejection
  {
    event: 'rejection',
    channel: 'EMAIL',
    name: 'Application Outcome Notification',
    description: 'Sent when an application is not selected for the current cohort session.',
    subject: 'Update on your NextGen Class Application: {{programmeName}}',
    bodyText: `Dear {{recipientName}},

Thank you for your interest in NextGen Class and for applying to {{programmeName}} ({{cohortName}}).

After careful consideration and review of all submissions, we regret to inform you that we are unable to offer you admission for this cohort session due to strict seat limits.

We encourage you to continue developing your skills and apply for future cohort sessions.

View upcoming cohort dates:
{{actionUrl}}

We wish you all the best in your continued learning journey.

Sincerely,
NextGen Class Admissions Committee`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #475569; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .btn { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Admissions Decision</p>
      <h1>Application Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Thank you for your application to <strong>{{programmeName}}</strong> (<strong>{{cohortName}}</strong>).</p>
      <p>Due to high application volume and limited cohort capacity, we are unable to offer you a seat for this intake.</p>
      <p>We invite you to explore and apply for upcoming cohort cycles.</p>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Explore Upcoming Cohorts</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Office of Admissions</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `*NextGen Class Admissions Update*
Dear *{{recipientName}}*, thank you for applying to *{{programmeName}}*. Due to cohort capacity limits, we are unable to offer admission for this session. We encourage you to reapply for upcoming intakes:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'actionUrl'],
    isActive: true,
  },

  // 7. Enrolment
  {
    event: 'enrolment',
    channel: 'EMAIL',
    name: 'Enrolment Confirmation & Welcome',
    description: 'Sent when an accepted student accepts the offer and enrols in the cohort.',
    subject: 'Welcome to NextGen Class: Enrolment Confirmed for {{cohortName}}',
    bodyText: `Dear {{recipientName}},

Welcome aboard! Your enrolment in {{programmeName}} — {{cohortName}} is now officially confirmed.

Enrolment Details:
• Student ID: {{learnerId}}
• Programme: {{programmeName}}
• Cohort: {{cohortName}}
• Start Date: {{startDate}}

Your student portal is now fully activated. You have access to class schedules, curriculum modules, assignments, and learning resources.

Access your Learner Hub:
{{actionUrl}}

We look forward to an impactful learning experience together!

Best regards,
NextGen Class Academic Operations`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #0284c7; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Welcome to the Cohort</p>
      <h1>Enrolment Confirmed</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Your enrolment in <strong>{{programmeName}}</strong> (<strong>{{cohortName}}</strong>) has been successfully finalized.</p>
      
      <div class="card">
        <div><strong>Student ID:</strong> {{learnerId}}</div>
        <div><strong>Programme:</strong> {{programmeName}}</div>
        <div><strong>Cohort:</strong> {{cohortName}}</div>
        <div><strong>Start Date:</strong> {{startDate}}</div>
      </div>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Launch Learner Workspace</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Academic Operations</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `🚀 *Welcome to NextGen Class!*
Hi *{{recipientName}}*, your enrolment in *{{programmeName}}* ({{cohortName}}) is confirmed!

*Student ID:* {{learnerId}}
*Start Date:* {{startDate}}

Launch your Learner Dashboard:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'learnerId', 'startDate', 'actionUrl'],
    isActive: true,
  },

  // 8. Class Reminder
  {
    event: 'class_reminder',
    channel: 'EMAIL',
    name: 'Upcoming Live Class Reminder',
    description: 'Sent prior to live scheduled lectures, workshops, or lab sessions.',
    subject: 'Class Reminder: {{classTitle}} starts at {{classTime}}',
    bodyText: `Dear {{recipientName}},

This is a reminder for your upcoming live class session for {{cohortName}}.

Session Details:
• Title: {{classTitle}}
• Date & Time: {{classTime}}
• Facilitator: {{instructorName}}
• Meeting Link: {{meetingUrl}}

Please join on time to ensure your attendance is recorded.

Join Class:
{{meetingUrl}}

NextGen Class Academic Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #7c3aed; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .card { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Live Class Session</p>
      <h1>Upcoming Class Reminder</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Your next live lecture session is scheduled to begin soon.</p>
      
      <div class="card">
        <div><strong>Session:</strong> {{classTitle}}</div>
        <div><strong>Time:</strong> {{classTime}}</div>
        <div><strong>Facilitator:</strong> {{instructorName}}</div>
      </div>

      <div style="text-align: center;">
        <a href="{{meetingUrl}}" class="btn">Join Live Session</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Class Operations</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `📚 *Live Class Reminder*
Hi *{{recipientName}}*, your class *{{classTitle}}* begins at *{{classTime}}*.
*Facilitator:* {{instructorName}}

Join live meeting link:
{{meetingUrl}}`,
    variables: ['recipientName', 'cohortName', 'classTitle', 'classTime', 'instructorName', 'meetingUrl'],
    isActive: true,
  },

  // 9. Assignment Reminder
  {
    event: 'assignment_reminder',
    channel: 'EMAIL',
    name: 'Assignment Due Date Reminder',
    description: 'Sent to learners with pending assignments nearing due date.',
    subject: 'Assignment Due Reminder: {{assignmentTitle}} (Due {{dueDate}})',
    bodyText: `Dear {{recipientName}},

This is a reminder that the assignment "{{assignmentTitle}}" is due on {{dueDate}}.

Assignment Details:
• Title: {{assignmentTitle}}
• Programme: {{programmeName}}
• Due Date: {{dueDate}}
• Total Points: {{maxPoints}}

Please submit your work before the deadline to ensure your progress score is maintained.

Submit Assignment:
{{actionUrl}}

NextGen Class Academic Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #ea580c; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .card { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .btn { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Coursework Alert</p>
      <h1>Assignment Due Reminder</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Please remember to submit your assignment before the due date.</p>
      
      <div class="card">
        <div><strong>Assignment:</strong> {{assignmentTitle}}</div>
        <div><strong>Programme:</strong> {{programmeName}}</div>
        <div><strong>Due Date:</strong> {{dueDate}}</div>
        <div><strong>Max Points:</strong> {{maxPoints}} pts</div>
      </div>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">View and Submit Assignment</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Coursework Team</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `📋 *Assignment Reminder*
Hi *{{recipientName}}*, *{{assignmentTitle}}* is due on *{{dueDate}}*.
Points: {{maxPoints}} pts

Submit your work here:
{{actionUrl}}`,
    variables: ['recipientName', 'programmeName', 'assignmentTitle', 'dueDate', 'maxPoints', 'actionUrl'],
    isActive: true,
  },

  // 10. Feedback Reminder
  {
    event: 'feedback_reminder',
    channel: 'EMAIL',
    name: 'Module & Instructor Feedback Survey',
    description: 'Sent requesting feedback on curriculum, session quality, or facilitators.',
    subject: 'Your Voice Matters: Feedback Request for {{moduleTitle}}',
    bodyText: `Dear {{recipientName}},

We hope you are enjoying your learning experience in {{cohortName}}.

Please take 3 minutes to share your feedback for "{{moduleTitle}}". Your ratings and comments help us continuously enhance teaching quality and course content.

Complete Survey:
{{actionUrl}}

Thank you for your partnership!
NextGen Class M&E and Quality Team`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .header { background: #4f46e5; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
  .footer { background: #f1f5f9; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase;">Quality & Evaluation</p>
      <h1>We Value Your Feedback</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Please take 3 minutes to provide constructive feedback on <strong>{{moduleTitle}}</strong> in <strong>{{cohortName}}</strong>.</p>
      <p>Your responses are reviewed by our Monitoring & Evaluation board to ensure top-tier instructional quality.</p>

      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="btn">Share Your Feedback</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Quality Assurance</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `⭐ *Feedback Request*
Hi *{{recipientName}}*, please take 3 mins to share your feedback on *{{moduleTitle}}* in *{{cohortName}}*:
{{actionUrl}}`,
    variables: ['recipientName', 'cohortName', 'moduleTitle', 'actionUrl'],
    isActive: true,
  },

  // 11. Certificate Issued
  {
    event: 'certificate_issued',
    channel: 'EMAIL',
    name: 'Graduation Certificate Release',
    description: 'Sent when official graduation certificate is minted with verification ID.',
    subject: 'Official Certificate Issued: {{programmeName}} — NextGen Class',
    bodyText: `Dear {{recipientName}},

Congratulations on successfully graduating from NextGen Class!

Your official Certificate of Completion for {{programmeName}} ({{cohortName}}) has been verified and issued.

Certificate Credentials:
• Graduate: {{recipientName}}
• Programme: {{programmeName}}
• Verification ID: {{verificationCode}}
• Issue Date: {{issueDate}}
• Grade/Honor: {{gradeHonors}}

View, download, and share your verified certificate:
{{certificateUrl}}

We celebrate your dedication and wish you boundless success!

NextGen Class Governing Board`,
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ca8a04; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #ca8a04 0%, #a16207 100%); padding: 32px; color: #ffffff; text-align: center; }
  .header h1 { margin: 8px 0 0; font-size: 24px; font-weight: 800; }
  .content { padding: 32px; font-size: 14px; line-height: 1.6; }
  .cert-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .btn { display: inline-block; background: #ca8a04; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; }
  .footer { background: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">Official Graduation Credential</div>
      <h1>Certificate of Completion</h1>
    </div>
    <div class="content">
      <p>Dear <strong>{{recipientName}}</strong>,</p>
      <p>Congratulations! Your official verifiable Certificate of Completion has been published.</p>
      
      <div class="cert-box">
        <div><strong>Programme:</strong> {{programmeName}}</div>
        <div><strong>Cohort:</strong> {{cohortName}}</div>
        <div><strong>Verification Code:</strong> <code>{{verificationCode}}</code></div>
        <div><strong>Issued On:</strong> {{issueDate}}</div>
        <div><strong>Honors / Standing:</strong> {{gradeHonors}}</div>
      </div>

      <div style="text-align: center;">
        <a href="{{certificateUrl}}" class="btn">View & Download Certificate</a>
      </div>
    </div>
    <div class="footer">
      <p>© NextGen Class Platform • Certification Authority</p>
    </div>
  </div>
</body>
</html>`,
    whatsAppText: `🎓 *Congratulations Graduate!*
Hi *{{recipientName}}*, your official Certificate of Completion for *{{programmeName}}* ({{cohortName}}) is ready!

*Verification ID:* {{verificationCode}}
*Honors:* {{gradeHonors}}

View your verified certificate:
{{certificateUrl}}`,
    variables: ['recipientName', 'programmeName', 'cohortName', 'verificationCode', 'issueDate', 'gradeHonors', 'certificateUrl'],
    isActive: true,
  },
];

/**
 * Replaces {{key}} variables in string
 */
export const interpolateTemplate = (
  template: string,
  variables: Record<string, string | number | undefined | null>
): string => {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (variables && variables[key] !== undefined && variables[key] !== null) {
      return String(variables[key]);
    }
    return match;
  });
};
