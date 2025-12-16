import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageComparer from "../ImageComparer";

vi.mock("resemblejs", () => ({
  default: vi.fn(),
}));

describe("ImageComparer Component", () => {
  it("should render without crashing", () => {
    render(<ImageComparer />);
    expect(
      screen.getByText(/visual image comparison tool/i)
    ).toBeInTheDocument();
  });

  it("should display file upload inputs", () => {
    render(<ImageComparer />);

    const fileInputs = screen.getAllByText(/choose file/i);
    expect(fileInputs).toHaveLength(2);
  });

  it("should display URL input fields", () => {
    render(<ImageComparer />);

    const urlInputs = screen.getAllByPlaceholderText(/https:\/\//i);
    expect(urlInputs).toHaveLength(2);
  });

  it("should have compare button disabled initially", () => {
    render(<ImageComparer />);

    const compareButton = screen.getByRole("button", {
      name: /compare images/i,
    });
    expect(compareButton).toBeDisabled();
  });

  it("should have reset button disabled initially", () => {
    render(<ImageComparer />);

    const resetButton = screen.getByRole("button", { name: /reset/i });
    expect(resetButton).toBeDisabled();
  });

  it("should display threshold slider", () => {
    render(<ImageComparer />);

    expect(screen.getByText(/mismatch threshold/i)).toBeInTheDocument();
  });

  it("should allow threshold adjustment", async () => {
    render(<ImageComparer />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "10" } });
    expect(slider).toHaveValue("10");
  });

  it("should show advanced options accordion", () => {
    render(<ImageComparer />);

    expect(screen.getByText(/advanced options/i)).toBeInTheDocument();
  });

  it("should display error color picker", async () => {
    render(<ImageComparer />);

    const advancedTrigger = screen.getByText(/advanced options/i);
    await userEvent.click(advancedTrigger);

    await waitFor(() => {
      expect(screen.getByText(/error color/i)).toBeInTheDocument();
    });
  });

  it("should have checkboxes for ignore options", async () => {
    render(<ImageComparer />);

    const advancedTrigger = screen.getByText(/advanced options/i);
    await userEvent.click(advancedTrigger);

    await waitFor(() => {
      expect(screen.getByLabelText(/ignore antialiasing/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ignore colors/i)).toBeInTheDocument();
    });
  });

  it("should allow URL input", async () => {
    render(<ImageComparer />);

    const urlInputs = screen.getAllByPlaceholderText(/https:\/\//i);
    const baseUrlInput = urlInputs[0];

    await userEvent.type(baseUrlInput, "https://example.com/image1.png");
    expect(baseUrlInput).toHaveValue("https://example.com/image1.png");
  });

  it("should enable compare button when both images are set", async () => {
    render(<ImageComparer />);

    const urlInputs = screen.getAllByPlaceholderText(/https:\/\//i);

    await userEvent.type(urlInputs[0], "https://example.com/image1.png");
    await userEvent.type(urlInputs[1], "https://example.com/image2.png");

    const compareButton = screen.getByRole("button", {
      name: /compare images/i,
    });

    await waitFor(() => {
      expect(compareButton).not.toBeDisabled();
    });
  });
});
