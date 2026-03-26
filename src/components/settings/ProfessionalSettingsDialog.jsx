import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Briefcase, Image as ImageIcon, X } from 'lucide-react';

export default function ProfessionalSettingsDialog({ open, onOpenChange }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    fullName: '',
    specialty: '',
    registry: '',
    logoBase64: '', // Agora armazenamos a imagem como base64
  });

  // Carrega as informações salvas no navegador quando abre
  useEffect(() => {
    if (open) {
      const savedInfo = localStorage.getItem('lumie_professional_info');
      if (savedInfo) {
        setForm(JSON.parse(savedInfo));
      }
    }
  }, [open]);

  // Função para converter o arquivo de imagem em Base64
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Quando a leitura terminar, o resultado é o Base64
        setForm({ ...form, logoBase64: reader.result });
      };
      reader.readAsDataURL(file); // Inicia a leitura do arquivo
    } else if (file) {
      alert("Por favor, selecione um arquivo de imagem válido (.png, .jpg, .jpeg)");
    }
  };

  const removeLogo = () => {
    setForm({ ...form, logoBase64: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reseta o input de arquivo
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Salva localmente para ser usado na geração do PDF
    localStorage.setItem('lumie_professional_info', JSON.stringify(form));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Dados do Profissional (Para o Recibo)
          </DialogTitle>
          <DialogDescription>
            Estas informações e sua logo aparecerão no cabeçalho dos relatórios para os pacientes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Novo campo de Upload de Logo com Pré-visualização */}
          <div className="flex flex-col items-center gap-3 bg-secondary/20 p-4 rounded-lg border border-border">
            {form.logoBase64 ? (
              <div className="relative">
                <img 
                  src={form.logoBase64} 
                  alt="Sua logo" 
                  className="h-16 w-auto object-contain rounded border border-border bg-white p-1"
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full" 
                  onClick={removeLogo}
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border border-border">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <Label htmlFor="logoFile" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:text-primary/80">
                  {form.logoBase64 ? 'Trocar sua logo' : 'Fazer upload da sua logo profissional'}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Formato PNG ou JPG. Tamanho máximo recomendado 1MB.
                </p>
              </Label>
              <Input
                id="logoFile"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden" // Esconde o input feio do navegador
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fullName">Seu Nome Completo (Como no registro)</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ex: Dra. Ana Silva"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="Ex: Psicóloga"
              />
            </div>
            <div>
              <Label htmlFor="registry">Seu Registro (CRP/CRM/CREFITO)</Label>
              <Input
                id="registry"
                value={form.registry}
                onChange={(e) => setForm({ ...form, registry: e.target.value })}
                placeholder="Ex: CRP 00/00000"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Dados Professional
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}