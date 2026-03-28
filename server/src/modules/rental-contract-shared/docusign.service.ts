import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as docusign from 'docusign-esign';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocusignService {
    private readonly logger = new Logger(DocusignService.name);
    private apiClient: docusign.ApiClient;

    constructor(private readonly configService: ConfigService) {
        this.apiClient = new docusign.ApiClient();
    }

    /**
     * Authenticate and getting access token using JWT Grant
     */
    private async authenticate(): Promise<void> {
        const integratorKey = this.configService.get<string>('DOCUSIGN_INTEGRATOR_KEY');
        const userId = this.configService.get<string>('DOCUSIGN_USER_ID');
        const authServer = this.configService.get<string>('DOCUSIGN_AUTH_SERVER') || 'account-d.docusign.com';
        const privateKeyPath = this.configService.get<string>('DOCUSIGN_PRIVATE_KEY_PATH');

        if (!integratorKey || !userId || !privateKeyPath) {
            throw new Error('Missing DocuSign configuration in environment variables');
        }

        const privateKey = await fs.readFile(path.join(process.cwd(), privateKeyPath));
        const scopes = ['signature', 'impersonation'];

        this.apiClient.setOAuthBasePath(authServer);
        const results = await this.apiClient.requestJWTUserToken(
            integratorKey,
            userId,
            scopes,
            privateKey,
            3600
        );

        this.apiClient.setAccessToken(results.body.access_token);
    }

    /**
     * Create an envelope for signing
     * @param pdfBuffer PDF document buffer
     * @param signerName Name of the signer
     * @param signerEmail Email of the signer
     * @param clientUserId Unique ID for embedded signing
     * @returns Envelope result
     */
    async createEnvelope(
        pdfBuffer: Buffer,
        signerName: string,
        signerEmail: string,
        clientUserId: string,
        contractCode: string
    ): Promise<string> {
        await this.authenticate();

        const accountId = this.configService.get<string>('DOCUSIGN_ACCOUNT_ID');
        const basePath = this.configService.get<string>('DOCUSIGN_BASE_PATH') || 'https://demo.docusign.net/restapi';
        this.apiClient.setBasePath(basePath);

        const envelopesApi = new docusign.EnvelopesApi(this.apiClient);

        // Create document
        const doc = new docusign.Document();
        doc.documentBase64 = pdfBuffer.toString('base64');
        doc.name = `Hop_dong_${contractCode}.pdf`;
        doc.fileExtension = 'pdf';
        doc.documentId = '1';

        // Create signer
        const signer = docusign.Signer.constructFromObject({
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            clientUserId: clientUserId, // Required for embedded signing
        });

        // Add sign here tab
        const signHere = docusign.SignHere.constructFromObject({
            anchorString: '/sn1/', // Assume template has this anchor or we use coordinates
            anchorUnits: 'pixels',
            anchorYOffset: '10',
            anchorXOffset: '20'
        });

        const signerTabs = docusign.Tabs.constructFromObject({
            signHereTabs: [signHere]
        });
        signer.tabs = signerTabs;

        // Add recipients to envelope
        const recipients = docusign.Recipients.constructFromObject({
            signers: [signer]
        });

        // Create envelope definition
        const envDefinition = new docusign.EnvelopeDefinition();
        envDefinition.emailSubject = `Vui lòng ký hợp đồng thuê kho GenHub: ${contractCode}`;
        envDefinition.documents = [doc];
        envDefinition.recipients = recipients;
        envDefinition.status = 'sent';

        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        return results.envelopeId;
    }

    /**
     * Generate signing URL for embedded signing
     * @param envelopeId Envelope ID
     * @param signerName Signer name
     * @param signerEmail Signer email
     * @param clientUserId Unique ID used during envelope creation
     * @param returnUrl URL to redirect after signing
     * @returns Signing URL
     */
    async getRecipientViewUrl(
        envelopeId: string,
        signerName: string,
        signerEmail: string,
        clientUserId: string,
        returnUrl: string
    ): Promise<string> {
        await this.authenticate();

        const accountId = this.configService.get<string>('DOCUSIGN_ACCOUNT_ID');
        const envelopesApi = new docusign.EnvelopesApi(this.apiClient);

        const viewRequest = docusign.RecipientViewRequest.constructFromObject({
            returnUrl: returnUrl,
            authenticationMethod: 'none',
            email: signerEmail,
            userName: signerName,
            clientUserId: clientUserId,
        });

        const results = await envelopesApi.createRecipientView(accountId, envelopeId, { recipientViewRequest: viewRequest });
        return results.url;
    }
}
